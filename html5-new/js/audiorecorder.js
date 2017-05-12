(function ($) {
	$.fn.audioRecorder = function(options, callback) {
		$(this).append('\
	            <div class="record"> \
	            <div class="left"> \
	                <div class="start"></div> \
	                <div class="pause" style="display: none;"></div> \
	            </div> \
	            <div class="right"> \
	                <div class="setting">' + locString.mic + ': <span class="micname">Default</span> \
	                    <a class="change-setting" href="javascript:;">[Change]</a></div> \
	                <div class="content"> \
	                   <div class="tip">' + locString.record + '</div> \
	                   <div id="wave-container" class="waveform hide"></div> \
	                </div> \
	                <div class="length"><span class="running">00:00</span>  /  <span class="total">00:01</span></div> \
	                <div class="process"> \
	                    <div class="progress hide"><span>' + locString.encoding + ':</span><span id="timer" class="progress-value"></span>%</div> \
                        <div class="uploading hide"><span>' + locString.uploading + '</span></div> \
                        <div class="savedone hide"><span>' + locString.done + '</span></div> \
			            <a class="save hide"><button>' + locString.save + '</button></a> \
	                </div> \
		    <div class="recordagain"> \
			<button type="button" class="hide again" id="btnrecordagain">' + locString.again + ' </button> \
		    </div> \
	            </div> \
	            <div class="modal hide"> \
	               <div class="config"> \
	                    <div class="mic hide"> \
	                        Microphone \
	                        <select class="inputs"> \
	                            <option>' + locString.defaultOption + '</option> \
	                        </select> \
	                    </div> \
	                    <div class="record-volume"> \
	                      <div class="pitch"> \
	                        <div class="outer"> \
	                            <div class="inner"> \
	                                <div></div> \
	                            </div> \
	                        </div> \
	                      </div> \
	                      <div class="sets"> \
	                        ' + locString.volume + ' \
	                        <input class="volume" type="range" min="0" max="1" step="0.1" value="0.5"/> \
	                        <div class="echo"><input type="checkbox"/> <span>' + locString.reduce + '</span></div> \
	                      </div> \
	                    </div> \
	                    <button type="button" class="close">' + locString.close + '</button> \
	                </div> \
	            </div> \
	        </div>');

		// Constants.
	    /**
	     * Maximum allowed length for audio recording.
	     */
	    var MAX_AUDIO_LENGTH = 480000;  // milli-seconds.
	    /**
	     * Time step for wave form.
	     */
	    var WAVE_STEP = 50;

		// variables.
	    /**
	     * The audio recorder.
	     */
	    var recorder = null;
	    /**
	     * The analyser node.
	     */
	    var analyserNode = null;
	    /**
	     * The audio context.
	     */
	    var audioContext = null;
	    /**
	     * Whether to update the wave.
	     */
	    var updateWave = false;
	    /**
	     * The input point.
	     */
	    var inputPoint = null;
	    /**
	     * The replay wave time interval.
	     */
	    var replayInterval = null;
	    /**
	     * The time length of the recorded audio.
	     */
	    var timeLength = 0;
	    /**
	     * The playback waveform object.
	     */
	    var waveform = null;
	    /**
	     * The recoding wave data array.
	     */
	    var alldata = [];
	    /**
	     * The configuration for audio capture.
	     */
	    var defaultConfig = {
	            "audio" : {
	                "mandatory" : {
	                    "echoCancellation" : "false"
	                }
	            }
	    };

		window.AudioContext = window.AudioContext || window.webkitAudioContext;
	    audioContext = new AudioContext();
	    if (!navigator.getUserMedia) {
	        navigator.getUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
	    }

	    // Start getting audio stream.
	    $('.length .total').text(getTimeString(MAX_AUDIO_LENGTH / 1000));

		 /**
	     * Start the recording wave form.
	     */
	    function startWaveform() {
	        // draw wave.
	        $('.waveform').show();
	        $('#wave-container').empty();
	        alldata = [];
	        waveform = new Waveform({
	            container : document.getElementById("wave-container"),
	            interpolate : false
	        });
	        var ctx = waveform.context;

	        var gradient = ctx.createLinearGradient(0, 0, 0, waveform.height);
	        gradient.addColorStop(0.0, "#000");
	        gradient.addColorStop(1.0, "#000");
	        waveform.innerColor = gradient;
	    }

		/**
	     * Draw the recording wave.
	     */
	    function draw() {
	        if (analyserNode == null) {
	            // Not initialized yet.
	            return;
	        }
	        var bufferLength = 1024;
	        var data = new Float32Array(bufferLength);
	        analyserNode.getFloatTimeDomainData(data);
	        var ac = autoCorrelate(data, audioContext.sampleRate);
	        if (ac == -1)
	            ac = 100;
	        else {
	            // level the waveform a bit
	            ac = ac * 10;
	        }

	        $('.pitch .inner').height(((ac - 100) / 25) + '%');

	        if (!updateWave) {
	            return;
	        }
	        alldata.push(ac / 10000);

	        if (waveform) {
	            waveform.update({
	                data : alldata
	            });
	        }
	        timeLength += WAVE_STEP;
	        if (timeLength >= MAX_AUDIO_LENGTH) {
	            timeLength = MAX_AUDIO_LENGTH;
	            $('.stop').click();
	        }
	        var sec = timeLength / 1000;
	        $('.length .running').text(getTimeString(sec));
	    }

	    setInterval(function() {
	        draw();
	    }, WAVE_STEP);

	    /**
	     * Start audio input capture.
	     * 
	     * @param config
	     *          the audio capture configuration.
	     */
	    function startCapture(config)
	    {
	        navigator.getUserMedia(config, function(stream) {
	            inputPoint = audioContext.createGain();

	            audioInput = audioContext.createMediaStreamSource(stream);
	            audioInput.connect(inputPoint);

	            analyserNode = audioContext.createAnalyser();
	            analyserNode.fftSize = 2048;
	            inputPoint.connect(analyserNode);

	            // mp3Recorder = new Recorder(inputPoint, null, function (progress) {
	            //     $('.progress-value').text(progress);
	            // });
				recorder = new MP3Recorder({
					bitRate: 128
				}), timer;


	            inputPoint.gain.value = 0.5;
	            initialize();
	        }, function(e) {
	            alert('Error getting audio.');
	            $('.start').addClass('disabled');
	            console.log(e);
	        });
	    }
	    startCapture(defaultConfig);

	    var wavesurfer = Object.create(WaveSurfer);

        $('.start').click(function(e) {
			var btn = $(this);
			if (btn.hasClass('disabled')) {
	            return;
	        }
	        if (btn.hasClass('stop')) {
				e.preventDefault();
				recorder.stop();
	           
	            btn.removeClass('stop');
	            btn.addClass('play');	            

				//get MP3
				clearInterval(timer);
				recorder.getMp3Blob(function (blob) {
				//var blobUrl = window.URL.createObjectURL(blob);

				var url = null;
				blobToDataURL(blob, function(url){
					// $('ol.convertedList')
					// 		.append('<li><strong> recording_' +
					// 		(new Date()) +
					// 		'_.mp3</strong><br/>' +
					// 		'<audio controls src="' + url + '"></audio>' +
					// 		'</li>');
					this.url = url;
				});
				}, function (e) {
					alert('We could not retrieve your message');
					console.log(e);
				});

				$('.again').show();
				$('#wave-container').empty();
				$('.tip').hide();
				$('.waveform').show();
				wavesurfer.init({
					container: document.querySelector('#wave-container'),
					waveColor: '#7B7B7B',
					progressColor: '#7A212E',
					cursorWidth: 0,
					height: $('#wave-container').height(),
					hideScrollbar: true,
					audioContext: audioContext,
					normalize: true
				});
				wavesurfer.on('ready', function() {
					$this.removeClass('disabled');
					wavesurfer.setVolume(1);
				});
				wavesurfer.load(url);
				//wavesurfer.loadBlob(wavBlob);
			}
			else if (btn.hasClass('play')) {
				btn.removeClass('play');
	            btn.addClass('play-pause');
	            wavesurfer.play();
	            var running = 0;
	            replayInterval = setInterval(function() {
	                running += 100;
	                if (running >= timeLength) {
	                    running = timeLength;
	                    clearInterval(replayInterval);
	                    $('.play-pause').click();
	                }
	                $('.length .running').text(getTimeString(running / 1000));
	            }, 100);
			}
			else if (btn.hasClass('play-pause')) {
			}
			else { // Default, record.
				e.preventDefault();

	            timeLength = 0;
	            btn.addClass('stop');
	            startWaveform();
	            updateWave = true;
	            $('.tip').hide();
	            $('.waveform').show();
	            $('.pause').hide();
	            // mp3Recorder.clear();
	            // mp3Recorder.record();
				
				recorder.start(function () {
					//start timer,
					var seconds = 0, updateTimer = function(){
						 $('.length .total').text(getTimeString(seconds));
						//$('#timer').text(seconds < 10 ? '0' + seconds : seconds);
					};
					timer = setInterval(function () {
						seconds++;
						updateTimer();
					}, 1000);
					updateTimer();
					//disable start button
					// btn.attr('disabled', true);
					// $('#stopBtn').removeAttr('disabled');
				}, function () {
					alert('We could not make use of your microphone at the moment');
				});
			}            
        });

        function blobToDataURL(blob, callback) {
            var a = new FileReader();
            a.onload = function (e) {
                callback(e.target.result);
            }
            a.readAsDataURL(blob);
        }

		function initialize()
	    {
	        updateWave = false;
	        $('.length .total').text(getTimeString(MAX_AUDIO_LENGTH / 1000));
	        $('.length .running').text(getTimeString(0));
	        $('.start').removeClass('play');
	        $('.start').removeClass('stop');
	        $('.start').removeClass('play-pause');
	        $('.start').removeClass('disabled');
	        $('.progress').hide();
	        $('.waveform').empty();
	        $('.waveform').hide();
	        $('.save').hide();
	        $('.pause').removeClass('resume');
	        $('.pause').hide();
	        $(this).hide();
	        $('.tip').show();
	        $('.savedone').hide();
	        clearInterval(replayInterval);
	    }

		$(".again").click(function ()
	    {
	        initialize();
	    });

		function getTimeString(sec) {
	        var minutes = Math.floor(sec / 60);
	        var seconds = Math.round(sec) % 60;
	        minutes = (minutes >= 10 ? '' : '0') + minutes;
	        seconds = (seconds >= 10 ? '' : '0') + seconds;
	        return minutes + ':' + seconds;
	    }
    }
})(jQuery);
