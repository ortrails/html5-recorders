/*License (MIT)

Copyright © 2013 Matt Diamond

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated 
documentation files (the "Software"), to deal in the Software without restriction, including without limitation 
the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and 
to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of 
the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO 
THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE 
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF 
CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER 
DEALINGS IN THE SOFTWARE.
*/
importScripts('libmp3lame.min.js');

var mp3codec;

self.onmessage = function(e) {
	switch (e.data.cmd) {
	case 'init':
		if (!e.data.config) {
			e.data.config = { };
		}
		mp3codec = Lame.init();

		Lame.set_mode(mp3codec, e.data.config.mode || Lame.MONO);
		Lame.set_num_channels(mp3codec, e.data.config.channels || 1);
		//Lame.set_out_samplerate(mp3codec, e.data.config.samplerate / 4 || 11025);
	    //Lame.set_bitrate(mp3codec, e.data.config.bitrate || 128);
	    Lame.set_out_samplerate(mp3codec, 44100);
	    Lame.set_bitrate(mp3codec, 128);

		Lame.init_params(mp3codec);
		break;
	case 'encode':
	    var length = e.data.buf.length;
	    //var splitLength = parseInt(length / 20);
	    var splitLength = 1152;

	    var tempLength = 0;
	    var mp3data;
	    var mp3BufferLength = 0;
	    var mp3Buffer = []
	    while (tempLength < length) {
	        var start = tempLength;
	        var end = tempLength + splitLength;
	        if (end > length) {
	            end = length;
	        }
	        var data = getSubBuffer(e.data.buf, start, end)
	        mp3data = Lame.encode_buffer_ieee_float(mp3codec, data, data);
	        mp3Buffer.push(mp3data.data);
	        mp3BufferLength = mp3BufferLength + mp3data.data.length;
	        tempLength = end;
	        self.postMessage({cmd: 'progress', value: Math.round(tempLength * 100 / length)});
	    }


    	var result = new Uint8Array(mp3BufferLength);
    	for (var i = 0, offset = 0; i < mp3Buffer.length; i++) {
    		result.set(mp3Buffer[i], offset);
    		offset += mp3Buffer[i].length;
    	}

		// var mp3data = Lame.encode_buffer_ieee_float(mp3codec, e.data.buf, e.data.buf);
		self.postMessage({cmd: 'data', buf: result});
		break;
	case 'finish':
		var mp3data = Lame.encode_flush(mp3codec);
		self.postMessage({cmd: 'end', buf: mp3data.data});
		Lame.close(mp3codec);
		mp3codec = null;
		break;
	}
};

function getSubBuffer(buff, start, end) {
    var result = new Float32Array(end - start);
    for (i = start; i < end; i++) {
    	result[i-start] = buff[i];
    }
    return result;
}