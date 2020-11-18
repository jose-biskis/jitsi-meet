// @flow

import * as StackBlur from 'stackblur-canvas';

import {
    CLEAR_TIMEOUT,
    TIMEOUT_TICK,
    SET_TIMEOUT,
    timerWorkerScript
} from './TimerWorker';

import * as bodyPix from '@tensorflow-models/body-pix';


/**
 * Represents a modified MediaStream that adds blur to video background.
 * <tt>JitsiStreamBlurEffect</tt> does the processing of the original
 * video stream.
 */
export default class JitsiStreamBlurEffect {
    _bpModel: Object;
    _display: String;
    _inputVideoElement: HTMLVideoElement;
    _inputVideoCanvasElement: HTMLCanvasElement;
    _imageCanvasElement: HTMLCanvasElement;
    _inputImageElement: HTMLImageElement;
    _onMaskFrameTimer: Function;
    _maskFrameTimerWorker: Worker;
    _maskInProgress: boolean;
    _outputCanvasElement: HTMLCanvasElement;
    _renderMask: Function;
    _segmentationData: Object;
    isEnabled: Function;
    startEffect: Function;
    stopEffect: Function;

    /**
     * Represents a modified video MediaStream track.
     *
     * @class
     * @param {BodyPix} bpModel - BodyPix model.
     */
    constructor() {
        // Bind event handler so it is only bound once for every instance.
        this._onMaskFrameTimer = this._onMaskFrameTimer.bind(this);

        // Workaround for FF issue https://bugzilla.mozilla.org/show_bug.cgi?id=1388974
        this._outputCanvasElement = document.createElement('canvas');
        this._outputCanvasElement.getContext('2d');
        this._inputVideoElement = document.createElement('video');
        this._inputVideoCanvasElement = document.createElement('canvas');
        this._inputImageElement = document.createElement('img');

        fetch('https://admin.ozjitsi.xyz/urlBackground')
            .then(response => response.json())
            .then(response => { 
                this._inputImageElement.crossOrigin = 'Anonymous';
                this._inputImageElement.src = response.msg; 
                console.log(this._inputImageElement.src, 'backgroundStartLoading');
            });
        

        this._imageCanvasElement = document.createElement('canvas');
    }

    /**
     * EventHandler onmessage for the maskFrameTimerWorker WebWorker.
     *
     * @private
     * @param {EventHandler} response - The onmessage EventHandler parameter.
     * @returns {void}
     */
    async _onMaskFrameTimer(response: Object) {
        if (response.data.id === TIMEOUT_TICK) {
            await this._renderMask();
        }
    }

    /**
     * Loop function to render the background mask.
     *
     * @private
     * @returns {void}
     */
    async _renderMask() {
        const cwidth = 640;
        const cheight = 360;

        const inputCanvasCtx = this._inputVideoCanvasElement.getContext('2d');    
        inputCanvasCtx.drawImage(this._inputVideoElement, 0, 0);

        this._inputVideoCanvasElement.width = cwidth;
        this._inputVideoCanvasElement.height = cheight;

        inputCanvasCtx.drawImage(this._inputVideoElement, 0, 0, cwidth, cheight);

        const currentFrame = inputCanvasCtx.getImageData(
            0,
            0,
            this._inputVideoCanvasElement.width,
            this._inputVideoCanvasElement.height
        );

        if (this._bpModel && this._display && this._inputImageElement.src) {
            if(!this._maskInProgress) {
                this._maskInProgress = true;
                let config = null;
                if(this._display == 'portrait') {
                    config = {
                        internalResolution: 'full', // resized to 0.5 times of the original resolution before inference
                        maxDetections: 1, // max. number of person poses to detect per image
                        segmentationThreshold: 0.5, // represents probability that a pixel belongs to a person
                        flipHorizontal: false,
                        scoreThreshold: 0.2
                    };
                } else {
                    config = {
                        internalResolution: 'full', // resized to 0.5 times of the original resolution before inference
                        maxDetections: 1, // max. number of person poses to detect per image
                        segmentationThreshold: 0.8, // represents probability that a pixel belongs to a person
                        flipHorizontal: false,
                        scoreThreshold: 0.2
                    };
                }
    
                this._bpModel.segmentPerson(this._inputVideoCanvasElement, config).then(data => {
                    this._segmentationData = data;
                    this._maskInProgress = false;
    
                    console.log('Is in effect');
                    //   console.log( currentFrame.data.length, 'Image Data');
                   if (this._segmentationData) {
                       const imageToReplaceCtx = this._imageCanvasElement.getContext('2d');
                       imageToReplaceCtx.drawImage(this._inputImageElement, 0, 0);
           
                       this._imageCanvasElement.width = currentFrame.width;
                       this._imageCanvasElement.height = currentFrame.height;
           
                       imageToReplaceCtx.drawImage(this._inputImageElement, 0, 0, currentFrame.width, currentFrame.height);
           
                       const imageToReplaceData = imageToReplaceCtx.getImageData(
                           0,
                           0,
                           currentFrame.width,
                           currentFrame.height
                       );
                       var frameWidth = currentFrame.width;
                       var frameHeight = currentFrame.height;
                       
                      // const blurData = new ImageData(currentFrame.data.slice(), currentFrame.width, currentFrame.height);
                       
                      
                       //StackBlur.image(this._outputCanvasElement, this._inputImageElement, 0);
                       //StackBlur.imageDataRGB(blurData, 0, 0, currentFrame.width, currentFrame.height, 12);
           /*
                       for (let x = 0; x < this._outputCanvasElement.width; x++) {
                           for (let y = 0; y < this._outputCanvasElement.height; y++) {
                               const n = (y * this._outputCanvasElement.width) + x;
           
                               if (this._segmentationData.data[n] === 0) {
                                   
                                   //currentFrame.data[n * 4] = imageToReplaceData.data[n * 4];
                                   //currentFrame.data[(n * 4) + 1] = imageToReplaceData.data[(n * 4) + 1];
                                   //currentFrame.data[(n * 4) + 2] = imageToReplaceData.data[(n * 4) + 2];
                                   //currentFrame.data[(n * 4) + 3] = imageToReplaceData.data[(n * 4) + 3];
                                   
                                   var n4 = n * 4;
                                   
                                   currentFrame.data[n4] = 255;
                                   currentFrame.data[(n4) + 1] = 255;
                                   currentFrame.data[(n4) + 2] = 255;
                                   currentFrame.data[(n4) + 3] = 255;
                                   
                                  
                                  //var n4 = n * 4;
                                  //currentFrame.data[n4] = 255;
                                  
                               }
                           }
                       }
                       */
                      var pixel = currentFrame.data;
                      var pixelLength = pixel.length;
                      var segmentsLength = pixelLength / frameWidth;
                      var segmentationData = this._segmentationData.data;
                      let i = 0;
                      let from = i * segmentsLength; 
           
                      for(i = 0; i < segmentsLength; i++) {
                          let to =  (from) + segmentsLength;
                          this.drawSegment(from, to, segmentationData, pixel, imageToReplaceData.data);
                          from = to;
                      }
                      
           
                    //  imageToReplaceCtx.putImageData(currentFrame)
           
                      /*
                      for(let p = 0; p < pixelLength; p+=4) {
                          if(this._segmentationData.data[p/4] === 0) {
                               pixel[p + 3] = 0;
                          }
                      }
                      */
                   }
    
                    this._outputCanvasElement.getContext('2d').imageSmoothingEnabled = true;
                    this._outputCanvasElement.getContext('2d').putImageData(currentFrame, 0, 0);
                });
            }
        } else {
            for (let x = 0; x < this._outputCanvasElement.width; x++) {
                for (let y = 0; y < this._outputCanvasElement.height; y++) {
                    const n = (y * this._outputCanvasElement.width) + x;

                    currentFrame.data[n * 4] = 0;
                    currentFrame.data[(n * 4) + 1] = 0;
                    currentFrame.data[(n * 4) + 2] = 0;
                    currentFrame.data[(n * 4) + 3] = 0;
                }
            }  
            console.log('Is in black effect');
            this._outputCanvasElement.getContext('2d').imageSmoothingEnabled = true;
            this._outputCanvasElement.getContext('2d').putImageData(currentFrame, 0, 0);
        }

        this._maskFrameTimerWorker.postMessage({
            id: SET_TIMEOUT,
            timeMs: 1000 / 1
        });
    }

    async drawSegment(from, to, segmentationData, pixel, imageToReplaceData) {
        for(let h = from; h < to; h+=4) {
            if(segmentationData[h/4] === 0) {
                pixel[h] = imageToReplaceData[h];
                pixel[h + 1] = imageToReplaceData[h + 1];
                pixel[h + 2] = imageToReplaceData[h + 2];
                pixel[h + 3] = imageToReplaceData[h + 3];
                //pixel[h + 3] = 0;
           }     
        }
    }

    /**
     * Checks if the local track supports this effect.
     *
     * @param {JitsiLocalTrack} jitsiLocalTrack - Track to apply effect.
     * @returns {boolean} - Returns true if this effect can run on the specified track
     * false otherwise.
     */
    isEnabled(jitsiLocalTrack: Object) {
        return jitsiLocalTrack.isVideoTrack() && jitsiLocalTrack.videoType === 'camera';
    }

    /**
     * Starts loop to capture video frame and render the segmentation mask.
     *
     * @param {MediaStream} stream - Stream to be used for processing.
     * @returns {MediaStream} - The stream with the applied effect.
     */
    startEffect(stream: MediaStream) {
    // An output stride of 16 and a multiplier of 0.5 are used for improved
    // performance on a larger range of CPUs.

    let bpModel = null;

    const firstVideoTrack = stream.getVideoTracks()[0];
    const { height, width, frameRate }
    = firstVideoTrack.getSettings ? firstVideoTrack.getSettings() : firstVideoTrack.getConstraints();

    if(!this._bpModel) {
        if(width > height) {
            this._display = 'landscape';
            bpModel = bodyPix.load({
                architecture: 'ResNet50',
                outputStride: 16,
                multiplier: 1,
                quantBytes: 4
            });
        } else {
            this._display = 'portrait';
            bpModel = bodyPix.load({
                architecture: 'MobileNetV1',
                outputStride: 8,
                multiplier: 1,
                quantBytes: 4,
		//modelUrl: 'https://storage.googleapis.com/tfjs-models/savedmodel/mobilenet_v2_1.0_224/model.json'
            });
        }

        bpModel
        .then(model => {
            this._bpModel = model;
        });
    }
    




        this._maskFrameTimerWorker = new Worker(timerWorkerScript, { name: 'Blur effect worker' });
        this._maskFrameTimerWorker.onmessage = this._onMaskFrameTimer;
            
        const cwidth = 640;
        const cheight = 360;

        this._outputCanvasElement.width = parseInt(cwidth, 10);
        this._outputCanvasElement.height = parseInt(cheight, 10);
        /*
        this._inputVideoCanvasElement.width = parseInt(cwidth, 10);
        this._inputVideoCanvasElement.height = parseInt(cheight, 10);
        this._inputVideoElement.width = parseInt(cwidth, 10);
        this._inputVideoElement.height = parseInt(cheight, 10);
        */

        /*
        this._imageCanvasElement.width = parseInt(width, 10);
        this._imageCanvasElement.height = parseInt(height, 10);
        this._inputImageElement.width = parseInt(width, 10);
        this._inputImageElement.height = parseInt(height, 10);
        */


        this._inputVideoElement.autoplay = true;
        this._inputVideoElement.srcObject = stream;
        this._inputVideoElement.onloadeddata = () => {
            this._maskFrameTimerWorker.postMessage({
                id: SET_TIMEOUT,
                timeMs: 1000 / 1
            });
        };

        return this._outputCanvasElement.captureStream(parseInt(frameRate, 10));
    }

    /**
     * Stops the capture and render loop.
     *
     * @returns {void}
     */
    stopEffect() {
        this._maskFrameTimerWorker.postMessage({
            id: CLEAR_TIMEOUT
        });

        this._maskFrameTimerWorker.terminate();
    }
}
