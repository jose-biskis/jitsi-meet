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
    _isImageReady = false;
    _display: String;
    _fwidth: Number;
    _fheight: Number;
    _imageToReplaceData: CanvasImageData;
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

        if (this._bpModel && this._display && this._isImageReady && this._imageToReplaceData) {
            const inputCanvasCtx = this._inputVideoCanvasElement.getContext('2d');    

            if(!this._maskInProgress) {

                this._maskInProgress = true;
                let config = null;
                let currentFrame = null;

                if(this._display == 'portrait') {
                    if(window.location.pathname.includes('resnet')) { 
                        config = {
                            internalResolution: 'medium', // resized to 0.5 times of the original resolution before inference
                            maxDetections: 1, // max. number of person poses to detect per image
                            segmentationThreshold: 0.7, // represents probability that a pixel belongs to a person
                            flipHorizontal: false,
                            scoreThreshold: 0.2
                        };
                    } else {
                        config = {
                            internalResolution: 'medium', // resized to 0.5 times of the original resolution before inference
                            maxDetections: 1, // max. number of person poses to detect per image
                            segmentationThreshold: 0.7, // represents probability that a pixel belongs to a person
                            flipHorizontal: false,
                            scoreThreshold: 0.2
                        };                    
                    }



                    if(window.location.pathname.includes("experimentalLandscape")) {
			            let interceptorHeight = cheight * 0.5;
			            let interceptorWidth = cwidth * 0.5;
                        let interceptorCanvas = document.createElement('canvas');
                        let interceptorCtx = interceptorCanvas.getContext('2d');
                        let landscapeCanvas = document.createElement('canvas');
                        let landscapeCtx = landscapeCanvas.getContext('2d');
    
                        interceptorCtx.drawImage(this._inputVideoElement, 0, 0);
    
                        let pwidth = this._inputVideoCanvasElement.width;
                        let pheight = this._inputVideoCanvasElement.height;
    
                        let aspectRatio = pwidth / pheight;
    
                        let newWidth = Math.round(interceptorHeight * aspectRatio);
    
                        interceptorCanvas.width = newWidth;
                        interceptorCanvas.height = interceptorHeight;
    
                        interceptorCtx.drawImage(this._inputVideoElement, 0, 0, newWidth, interceptorHeight);
                
                        landscapeCanvas.width = interceptorWidth;
                        landscapeCanvas.height = interceptorHeight;
    
                        let startAtX = Math.round((interceptorWidth - newWidth) / 2);
    
                        landscapeCtx.drawImage(interceptorCanvas, startAtX, 0);
                
                        currentFrame = landscapeCtx.getImageData(
                            0,
                            0,
                            this.landscapeCanvas.width,
                            this.landscapeCanvas.height
                        );
                    } else {
                        inputCanvasCtx.drawImage(this._inputVideoElement, 0, 0);

                        this._inputVideoCanvasElement.width = Math.round(this._fwidth * 0.5);
                        this._inputVideoCanvasElement.height = Math.round(this._fheight * 0.5);
                
                        inputCanvasCtx.drawImage(this._inputVideoElement, 0, 0, Math.round(this._fwidth * 0.5), Math.round(this._fwidth * 0.5));
                
                        currentFrame = inputCanvasCtx.getImageData(
                            0,
                            0,
                            this._inputVideoCanvasElement.width,
                            this._inputVideoCanvasElement.height
                        );
                    }

                } else {
                    if(window.location.pathname.includes('resnet')) { 
                        config = {
                            internalResolution: 'full', // resized to 0.5 times of the original resolution before inference
                            maxDetections: 1, // max. number of person poses to detect per image
                            segmentationThreshold: 0.8, // represents probability that a pixel belongs to a person
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

                    inputCanvasCtx.drawImage(this._inputVideoElement, 0, 0);

                    this._inputVideoCanvasElement.width = cwidth;
                    this._inputVideoCanvasElement.height = cheight;
            
                    inputCanvasCtx.drawImage(this._inputVideoElement, 0, 0, cwidth, cheight);
            
                    currentFrame = inputCanvasCtx.getImageData(
                        0,
                        0,
                        this._inputVideoCanvasElement.width,
                        this._inputVideoCanvasElement.height
                    );
                }
    
                this._bpModel.segmentPerson(this._inputVideoCanvasElement, config).then(data => {
                    this._segmentationData = data;
                    this._maskInProgress = false;
    
                    console.log('Is in effect');
                    
                   if (this._segmentationData) {
                        var frameWidth = currentFrame.width;
                        var frameHeight = currentFrame.height;

                        var pixel = currentFrame.data;
                        var pixelLength = pixel.length;
                        var segmentsLength = pixelLength / frameWidth;
                        var segmentationData = this._segmentationData.data;
                        let i = 0;
                        let from = i * segmentsLength; 
           
                        for(i = 0; i < segmentsLength; i++) {
                            let to =  (from) + segmentsLength;
                            this.drawSegment(from, to, segmentationData, pixel, this._imageToReplaceData.data);
                            from = to;
                        }
                   }
    
                    this._outputCanvasElement.getContext('2d').imageSmoothingEnabled = true;
                    this._outputCanvasElement.getContext('2d').putImageData(currentFrame, 0, 0);
                });
            }
        } else {
            let blackCanvas = document.createElement('canvas');
            let blackCtx = blackCanvas.getContext('2d');
            
            blackCanvas.width = this._outputCanvasElement.width;
            blackCanvas.height = this._outputCanvasElement.height;
    
            blackCtx.drawImage(this._inputVideoElement, 0, 0, blackCanvas.width, blackCanvas.height);
            
            const currentFrame = blackCtx.getImageData(
                0,
                0,
                blackCanvas.width,
                blackCanvas.height
            );

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
        
        this._fheight = height;
        this._fwidth = width;
        const cwidth = 640;
        const cheight = 360;

        if(!this._bpModel) {
            let inverted = window.location.pathname.includes('inverted');

            if(inverted || (width > height)) {
                this._display = 'landscape';

                if(window.location.pathname.includes('resnet')) {
                    bpModel = bodyPix.load({
                        architecture: 'ResNet50',
                        outputStride: 16,
                        multiplier: 1,
                        quantBytes: 4
                    });
                } else {
                    bpModel = bodyPix.load({
                        architecture: 'MobileNetV1',
                        outputStride: 8,
                        multiplier: 1,
                        quantBytes: 4
                    });
                }
            } else {
                this._display = 'portrait';

                if(window.location.pathname.includes('resnet')) {
                    bpModel = bodyPix.load({
                        architecture: 'ResNet50',
                        outputStride: 16,
                        multiplier: 1,
                        quantBytes: 1
                    });
                } else {
                    bpModel = bodyPix.load({
                        architecture: 'MobileNetV1',
                        outputStride: 8,
                        multiplier: 1,
                        quantBytes: 4
                    });
                }
            }

            if((!this._display || this._display == 'landscape')) { 
                this._outputCanvasElement.width = parseInt(cwidth, 10);
                this._outputCanvasElement.height = parseInt(cheight, 10);
            } else {
                if(window.location.pathname.includes("experimentalLandscape")) {
                    this._outputCanvasElement.width = parseInt(cwidth * 0.5,  10);
                    this._outputCanvasElement.height = parseInt(cheight * 0.5, 10); 
                } else {
                    this._outputCanvasElement.width = parseInt(Math.round(this._fwidth * 0.5), 10);
                    this._outputCanvasElement.height = parseInt(Math.round(this._fheight * 0.5), 10); 
                }   
            }

            fetch('https://admin.ozjitsi.xyz/urlBackground')
            .then(response => response.json())
            .then(response => { 
                this._inputImageElement.crossOrigin = 'Anonymous';
                this._inputImageElement.src = response.msg; 
                this._inputImageElement.onload = () => {
                    const imageToReplaceCtx = this._imageCanvasElement.getContext('2d');
                    imageToReplaceCtx.drawImage(this._inputImageElement, 0, 0);
        
                    this._imageCanvasElement.width = this._outputCanvasElement.width;
                    this._imageCanvasElement.height = this._outputCanvasElement.height;
        
                    imageToReplaceCtx.drawImage(this._inputImageElement, 0, 0, this._outputCanvasElement.width, this._outputCanvasElement.height);
        
                    this._imageToReplaceData = imageToReplaceCtx.getImageData(
                        0,
                        0,
                        this._outputCanvasElement.width,
                        this._outputCanvasElement.height
                    );
                    this._isImageReady = true;
                }

                console.log(this._inputImageElement.src, 'backgroundStartLoading');
            });

            bpModel
            .then(model => {
                this._bpModel = model;
            });
        }
        
        this._maskFrameTimerWorker = new Worker(timerWorkerScript, { name: 'Blur effect worker' });
        this._maskFrameTimerWorker.onmessage = this._onMaskFrameTimer;
            
    
        this._inputVideoCanvasElement.width = parseInt(Math.round(this._fwidth), 10);
        this._inputVideoCanvasElement.height = parseInt(Math.round(this._fheight), 10);
        this._inputVideoElement.width = parseInt(Math.round(this._fwidth), 10);
        this._inputVideoElement.height = parseInt(Math.round(this._fheight), 10);
       

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
