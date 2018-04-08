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
class FileTable{
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
    Object.keys(files).map((item) => {
      queue.push(instance.processFile(files[item]), () => {
        instance.emit('new_file');
      });
    });
  }
  processFile (file) {
    const instance = this;
    return (callback) => {

      const fileExtension = (filename, opts) => {
        if (!opts) opts = {};
        if (!filename) return "";
        var ext = (/[^./\\]*$/.exec(filename) || [""])[0];
        return opts.preserveCase ? ext : ext.toLowerCase();
      };

			let blobSlice =
        File.prototype.slice ||
        File.prototype.mozSlice ||
        File.prototype.webkitSlice;
			let chunkSize = 4194304;
			let chunks = Math.ceil(file.size / chunkSize);
			let currentChunk = 0;
      let hashInstance = sha3_256.create();
      instance.emit('bufferStart');
      let readFile = (file) => {
        let fileReader = new FileReader();
        fileReader.onload = (e) => {
          console.log(e.target.result);
          instance.emit('bufferAppend', e.target.result);
          hashInstance.update(e.target.result);
          currentChunk++;
          if (currentChunk < chunks) {
            readFile(file);
          } else {
            let hashedFileName = btoa(hashInstance.hex()).concat('.', fileExtension(file.name));
            console.log(hashedFileName);
            instance.emit('bufferEnd');
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
  addFile () {
    return new Promise((resolve, reject) => {
      const file = {
        name: 'asd.jpg',
        sha256hash: '',
        chunkSize: 123
      };
    });
  }
  getFiles () {
    return this._files;
  }
  getFileChunk (fileHash, chunkIndex) {
    return this._chunks[fileHash][chunkIndex];
  }
}
window.FileTable = FileTable;
