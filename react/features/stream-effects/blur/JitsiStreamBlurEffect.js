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
    _interceptorHeight: Number;
    _interceptorWidth: Number;
    _aspectRatio: Number;
    _startAtX: Number;
    _blackCanvas: HTMLCanvasElement;
    _blackCtx: CanvasRenderingContext2D;
    _interceptorCanvas: HTMLCanvasElement;
    _interceptorCtx: CanvasRenderingContext2D;
    _landscapeCanvas: HTMLCanvasElement;
    _landscapeCtx: CanvasRenderingContext2D;
    _outputCanvasCtx: CanvasRenderingContext2D;
    _inputCanvasCtx: CanvasRenderingContext2D;
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
    _modelConfig: Object;
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
        this._inputVideoElement = document.createElement('video');
        this._inputVideoCanvasElement = document.createElement('canvas');
        this._inputImageElement = document.createElement('img');
        this._imageCanvasElement = document.createElement('canvas');
        this._interceptorCanvas = document.createElement('canvas');
        this._interceptorCtx = this._interceptorCanvas.getContext('2d');
        this._landscapeCanvas = document.createElement('canvas');
        this._landscapeCtx = this._landscapeCanvas.getContext('2d');
        this._blackCanvas = document.createElement('canvas');
        this._blackCtx = this._blackCanvas.getContext('2d');
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
        if (this._bpModel && this._display && this._isImageReady && this._imageToReplaceData) {
            if(!this._maskInProgress) {

                this._maskInProgress = true;
                let currentFrame = null;
                let canvasElement = null;

                if(this._display == 'portrait') {
                    if(window.location.pathname.includes("experimentalLandscape")) {
                        this._interceptorCtx.drawImage(this._inputVideoElement, 0, 0, this._interceptorCanvas.width, this._interceptorCanvas.height);
                
                        this._landscapeCtx.drawImage(this._interceptorCanvas, this._startAtX, 0);
                        canvasElement = this._landscapeCanvas;
      
                        currentFrame = this._landscapeCtx.getImageData(
                            0,
                            0,
                            this._landscapeCanvas.width,
                            this._landscapeCanvas.height
                        );
                    } else {                
                        this._inputCanvasCtx.drawImage(this._inputVideoElement, 0, 0, this._outputCanvasElement.width, this._outputCanvasElement.height);
                        canvasElement = this._inputVideoCanvasElement;
                        currentFrame = this._inputCanvasCtx.getImageData(
                            0,
                            0,
                            this._inputVideoCanvasElement.width,
                            this._inputVideoCanvasElement.height
                        );
                    }

                } else {
                    this._inputCanvasCtx.drawImage(this._inputVideoElement, 0, 0, this._outputCanvasElement.width, this._outputCanvasElement.height);
                    canvasElement = this._inputVideoCanvasElement;
                    currentFrame = this._inputCanvasCtx.getImageData(
                        0,
                        0,
                        this._inputVideoCanvasElement.width,
                        this._inputVideoCanvasElement.height
                    );
                }
    
                this._bpModel.segmentPerson(canvasElement, this._modelConfig).then(data => {
                    this._segmentationData = data;
                    this._maskInProgress = false;
    
                    console.log('Is in effect');
                    
                   if (this._segmentationData) {
                        var frameWidth = currentFrame.width;

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

                    this._outputCanvasCtx.putImageData(currentFrame, 0, 0);
                });
            }
        } else {
            this._blackCtx.drawImage(this._inputVideoElement, 0, 0, this._outputCanvasElement.width, this._outputCanvasElement.height);
            
            const currentFrame = this._blackCtx.getImageData(
                0,
                0,
                this._blackCanvas.width,
                this._blackCanvas.height
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
            this._outputCanvasCtx.putImageData(currentFrame, 0, 0);
        }

        this._maskFrameTimerWorker.postMessage({
            id: SET_TIMEOUT,
            timeMs: 1000 / 60
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
        
        this._maskFrameTimerWorker = new Worker(timerWorkerScript, { name: 'Blur effect worker' });
        this._maskFrameTimerWorker.onmessage = this._onMaskFrameTimer;

        let bpModel = null;

        const firstVideoTrack = stream.getVideoTracks()[0];
        const { height, width, frameRate }
        = firstVideoTrack.getSettings ? firstVideoTrack.getSettings() : firstVideoTrack.getConstraints();
        
        this._fheight = height;
        this._fwidth = width;
        const cwidth = 640;
        const cheight = 360;

        this._inputVideoCanvasElement.width = parseInt((this._fwidth) << 0, 10);
        this._inputVideoCanvasElement.height = parseInt((this._fheight) << 0, 10);
        this._inputVideoElement.width = parseInt((this._fwidth) << 0, 10);
        this._inputVideoElement.height = parseInt((this._fheight) << 0, 10);
        this._inputCanvasCtx = this._inputVideoCanvasElement.getContext('2d');  
        this._aspectRatio = this._inputVideoCanvasElement.width / this._inputVideoCanvasElement.height;

        if(!this._bpModel) {
            let inverted = window.location.pathname.includes('inverted');

            if((width > height) && !inverted) {  
                if(window.location.pathname.includes('resnet')) { 
                    this._modelConfig = {
                        internalResolution: 'full', // resized to 0.5 times of the original resolution before inference
                        maxDetections: 1, // max. number of person poses to detect per image
                        segmentationThreshold: 0.8, // represents probability that a pixel belongs to a person
                        flipHorizontal: false,
                        scoreThreshold: 0.2
                    };  
                    
                    bpModel = bodyPix.load({
                        architecture: 'ResNet50',
                        outputStride: 16,
                        multiplier: 1,
                        quantBytes: 4
                    });
                } else if(window.location.pathname.includes('lowest')) {
                    this._modelConfig = {
                        internalResolution: 'low', // resized to 0.5 times of the original resolution before inference
                        maxDetections: 1, // max. number of person poses to detect per image
                        segmentationThreshold: 0.5, // represents probability that a pixel belongs to a person
                        flipHorizontal: false,
                        scoreThreshold: 0.2
                    };  
                    
                    bpModel = bodyPix.load({
                        architecture: 'MobileNetV1',
                        outputStride: 16,
                        multiplier: 0.75,
                        quantBytes: 2
                    });
                } else {
                    this._modelConfig = {
                        internalResolution: 'medium', // resized to 0.5 times of the original resolution before inference
                        maxDetections: 1, // max. number of person poses to detect per image
                        segmentationThreshold: 0.8, // represents probability that a pixel belongs to a person
                        flipHorizontal: false,
                        scoreThreshold: 0.2
                    };  
                    
                    bpModel = bodyPix.load({
                        architecture: 'MobileNetV1',
                        outputStride: 16,
                        multiplier: 0.75,
                        quantBytes: 4
                    });
                }
                

                this._display = 'landscape';
            } else {
                if(window.location.pathname.includes('resnet')) { 
                    bpModel = bodyPix.load({
                        architecture: 'ResNet50',
                        outputStride: 16,
                        multiplier: 1,
                        quantBytes: 1
                    });

                    this._modelConfig = {
                        internalResolution: 'medium', // resized to 0.5 times of the original resolution before inference
                        maxDetections: 1, // max. number of person poses to detect per image
                        segmentationThreshold: 0.7, // represents probability that a pixel belongs to a person
                        flipHorizontal: false,
                        scoreThreshold: 0.2
                    };
                }  else if(window.location.pathname.includes('lowest')) {
                    this._modelConfig = {
                        internalResolution: 'low', // resized to 0.5 times of the original resolution before inference
                        maxDetections: 1, // max. number of person poses to detect per image
                        segmentationThreshold: 0.5, // represents probability that a pixel belongs to a person
                        flipHorizontal: false,
                        scoreThreshold: 0.2
                    };  
                    
                    bpModel = bodyPix.load({
                        architecture: 'MobileNetV1',
                        outputStride: 16,
                        multiplier: 0.5,
                        quantBytes: 2
                    });
                } else {
                    this._modelConfig = {
                        internalResolution: 'medium', // resized to 0.5 times of the original resolution before inference
                        maxDetections: 1, // max. number of person poses to detect per image
                        segmentationThreshold: 0.8, // represents probability that a pixel belongs to a person
                        flipHorizontal: false,
                        scoreThreshold: 0.2
                    };  
                    
                    bpModel = bodyPix.load({
                        architecture: 'MobileNetV1',
                        outputStride: 16,
                        multiplier: 0.75,
                        quantBytes: 4
                    });                    
                }

                this._display = 'portrait';
            }

            if((!this._display || this._display == 'landscape')) { 
                this._outputCanvasElement.width = parseInt(cwidth, 10);
                this._outputCanvasElement.height = parseInt(cheight, 10);
         
                this._inputVideoCanvasElement.width = this._outputCanvasElement.width;
                this._inputVideoCanvasElement.height = this._outputCanvasElement.height;
            } else {
                if(window.location.pathname.includes("experimentalLandscape")) {
                    this._outputCanvasElement.width = parseInt(cwidth,  10);
                    this._outputCanvasElement.height = parseInt(cheight, 10); 
                } else {
                    this._outputCanvasElement.width = parseInt((this._fwidth) << 0, 10);
                    this._outputCanvasElement.height = parseInt((this._fheight) << 0, 10); 

                    this._inputVideoCanvasElement.width = this._outputCanvasElement.width;
                    this._inputVideoCanvasElement.height = this._outputCanvasElement.height;
                }   
            }

            this._blackCanvas.width = this._outputCanvasElement.width;
            this._blackCanvas.height = this._outputCanvasElement.height;

            this._interceptorHeight = this._outputCanvasElement.height;
            this._interceptorWidth = this._outputCanvasElement.width;
    
            this._interceptorCanvas.width = (this._interceptorHeight * this._aspectRatio) << 0;
            this._interceptorCanvas.height = this._interceptorHeight;

            this._startAtX = ((this._outputCanvasElement.width - this._interceptorCanvas.width) / 2) << 0;

            this._landscapeCanvas.width = this._outputCanvasElement.width;
            this._landscapeCanvas.height = this._outputCanvasElement.height;

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

        this._inputVideoElement.autoplay = true;
        this._inputVideoElement.srcObject = stream;
        this._inputVideoElement.onloadeddata = () => {
            this._maskFrameTimerWorker.postMessage({
                id: SET_TIMEOUT,
                timeMs: 1000 / 60
            });
        };

        this._outputCanvasCtx = this._outputCanvasElement.getContext('2d');
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
