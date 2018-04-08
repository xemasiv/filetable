// Pre-loaded:
// jquery(slim), js-sha3, eventemitter3, localforage
const sha3_256 = window.sha3_256;
const EventEmitter3 = window.EventEmitter3;
const localforage = window.localforage;
const async = window.async;
console.log('sha3_256:', sha3_256);
console.log('EventEmitter3:', EventEmitter3);
console.log('localforage:', localforage);
console.log('async:', async);
class FileTable {
  constructor () {
    this._files = [];
    this._chunks = {};
    let EventEmitter = new EventEmitter3();
    this.on = (...args) => {
      EventEmitter.on.apply(EventEmitter, args);
    };
    this.emit = (...args) => {
      EventEmitter.emit.apply(EventEmitter, args);
    }
    let queue = async.queue((task, callback) => {
      task(callback);
    });
    this._queue = queue;
  }
  bind (elementId) {
    const instance = this;
    $(elementId).change((...args)=>{
      this.queueFile.apply(instance, args);
    });
  }
  queueFile (e) {
    const instance = this;
    const queue = this._queue;
    const files = e.target.files;
    console.log(files);
    Object.keys(files).map((item) => {
      queue.push(instance.processFile(files[item]), () => {
        instance.emit('new_file');
      });
    });
  }
  processFile (file) {
    const instance = this;
    return (callback) => {

      /*
      const fileExtension = (filename, opts) => {
        if (!opts) opts = {};
        if (!filename) return "";
        var ext = (/[^./\\]*$/.exec(filename) || [""])[0];
        return opts.preserveCase ? ext : ext.toLowerCase();
      };
      */

			let blobSlice =
        File.prototype.slice ||
        File.prototype.mozSlice ||
        File.prototype.webkitSlice;
			let chunkSize = 128000;
			let chunks = Math.ceil(file.size / chunkSize);
			let currentChunk = 0;
      let hashInstance = sha3_256.create();
      // instance.emit('buffer_start');
      let chunkArray = [];
      let readFile = (file) => {
        let fileReader = new FileReader();
        fileReader.onload = (e) => {
          chunkArray.push(e.target.result);
          // instance.emit('buffer_append', e.target.result);
          hashInstance.update(e.target.result);
          currentChunk++;
          if (currentChunk < chunks) {
            readFile(file);
          } else {
            let fileHash = hashInstance.hex();
            // let fileHash = btoa(hashInstance.hex()).concat('.', fileExtension(file.name));
            let newFile = {
              name: file.name,
              type: file.type,
              hash: fileHash,
              chunkSize: chunkSize,
              chunkCount: currentChunk
            };
            instance._files.push(newFile);
            instance._chunks[fileHash] = chunkArray;
            // instance.emit('buffer_end');
            instance.emit('new_file', newFile);
            callback();
          }
        }
        fileReader.onerror = function () {
			    console.log("fileReader error.");
        };
        let start = currentChunk * chunkSize;
        let end = ((start + chunkSize) >= file.size) ? file.size : start + chunkSize;
        fileReader.readAsArrayBuffer(blobSlice.call(file, start, end));
      }
      readFile (file);
    };
  }
  getFiles () {
    return this._files;
  }
  getChunks () {
    return this._chunks;
  }
  getFileChunk (fileHash, chunkIndex) {
    return this._chunks[fileHash][chunkIndex];
  }
}
class VideoChunkLoader {
  constructor (videoElement, fileType, targetChunks) {
    let instance = this;

    let EventEmitter = new EventEmitter3();
    instance.on = (...args) => {
      EventEmitter.on.apply(EventEmitter, args);
    };
    instance.emit = (...args) => {
      EventEmitter.emit.apply(EventEmitter, args);
    }
    let codecSource = [];
    switch (fileType) {
      case 'video/webm':
        codecSource = ['vp8', 'vorbis', 'vp8,vorbis'];
        break;
      default:
        instance.emit('error', new Error('UNKNOWN FILE TYPE'));
        return;
        break;
    }
    let queue = async.queue((task, callback) => {
      task(callback);
    });
    queue.pause();
    instance._videoElement = videoElement;
    instance._fileType = fileType;
    instance._codecIndex = -1;
    instance._codecSource = codecSource;
    instance._queue = queue;
    instance._targetChunks = targetChunks;
    instance._processedArrayBuffers = [];
    instance.assignMediaSource();
  }
  assignMediaSource () {
    let instance = this;
    instance._codecIndex = instance._codecIndex + 1;
    let mimeType = ''.concat(
      instance._fileType, ';codecs=',
      '"', instance._codecSource[instance._codecIndex], '"'
    );
    instance.emit('try_mimetype', mimeType);
    if (instance._codecIndex > instance._codecSource.length -1) {
      instance.emit('error', new Error('MIMETYPE OPTIONS'));
      return;
    }
    let mediaSource = new MediaSource();
    instance._videoElement
      .prop('src', window.URL.createObjectURL(mediaSource));
    let queue = instance._queue;
    mediaSource.addEventListener('sourceopen', function handler () {
      let sourceBuffer = mediaSource.addSourceBuffer(mimeType);
      instance._sourceBuffer = sourceBuffer;
      mediaSource.removeEventListener('sourceopen', handler);
      instance._processedArrayBuffers.map((arrayBuffer) => {
        queue.unshift(instance.processArrayBuffer(arrayBuffer), () => {
          instance.emit('append_ok');
        });
      })
      instance._processedArrayBuffers = [];
      queue.resume();
    });
    instance._mediaSource = mediaSource;
    instance._loadedChunks = -1;
  }
  pushArrayBuffer (arrayBuffer) {
    const instance = this;
    const queue = this._queue;
    queue.push(instance.processArrayBuffer(arrayBuffer), () => {
      instance.emit('append_ok');
    });
  }
  processArrayBuffer (arrayBuffer) {
    const instance = this;
    let queue = instance._queue;
    return (callback) => {
      const sourceBuffer = instance._sourceBuffer;
      const mediaSource = instance._mediaSource;
      // console.log(instance._loadedChunks, instance._targetChunks);
      try {
        sourceBuffer.appendBuffer(new Uint8Array(arrayBuffer));
        sourceBuffer.addEventListener('updateend', function handler () {
          instance._loadedChunks = instance._loadedChunks + 1;
          instance._processedArrayBuffers.push(arrayBuffer);
          if (instance._loadedChunks === instance._targetChunks) {
            if (!sourceBuffer.updating && mediaSource.readyState === 'open') {
              mediaSource.endOfStream();
              instance.emit('done');
            }
          }
          // console.log(instance._loadedChunks, instance._targetChunks);
          sourceBuffer.removeEventListener('updateend', handler);
          callback()
        });
      } catch (e) {
        queue.pause();
        callback();
        instance._processedArrayBuffers.push(arrayBuffer);
        instance.assignMediaSource();
      }
    };
  }
}
window.FileTable = FileTable;
window.VideoChunkLoader = VideoChunkLoader;
