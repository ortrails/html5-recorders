(function ($) {
    $.fn.audioRecorder = function (options, callback) {
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
	                    <button type="button" class="close">' + locString.close + "</button> \
	                </div> \
	            </div> \
	        </div>");

        // Constants.
        /**
	     * Maximum allowed length for audio recording.
	     */
        var maxAudioLength = 480000;  // milli-seconds.
        /**
	     * Time step for wave form.
	     */
        var waveStep = 50;

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
            "audio": {
                "mandatory": {
                    "echoCancellation": "false"
                }
            }
        };
        var timer = null;
        var audioInput = null;

        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        audioContext = new AudioContext();
        if (!navigator.getUserMedia) {
            navigator.getUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
        }

        // Start getting audio stream.
        $(".length .total").text(getTimeString(maxAudioLength / 1000));

        /**
        * Start the recording wave form.
        */
        function startWaveform() {
            // draw wave.
            $(".waveform").show();
            $("#wave-container").empty();
            alldata = [];
            waveform = new Waveform({
                container: document.getElementById("wave-container"),
                interpolate: false
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
            if (ac === -1)
                ac = 100;
            else {
                // level the waveform a bit
                ac = ac * 10;
            }

            $(".pitch .inner").height(((ac - 100) / 25) + "%");

            if (!updateWave) {
                return;
            }
            alldata.push(ac / 10000);

            if (waveform) {
                waveform.update({
                    data: alldata
                });
            }
            timeLength += waveStep;
            if (timeLength >= maxAudioLength) {
                timeLength = maxAudioLength;
                $(".stop").click();
            }
            var sec = timeLength / 1000;
            $(".length .running").text(getTimeString(sec));
        }

        setInterval(function () {
            draw();
        }, waveStep);

        /**
	     * Start audio input capture.
	     * 
	     * @param config
	     *          the audio capture configuration.
	     */
        function startCapture(config) {
            navigator.getUserMedia(config, function (stream) {
                inputPoint = audioContext.createGain();

                audioInput = audioContext.createMediaStreamSource(stream);
                audioInput.connect(inputPoint);

                analyserNode = audioContext.createAnalyser();
                analyserNode.fftSize = 2048;
                inputPoint.connect(analyserNode);

                recorder = new MP3Recorder({
                    bitRate: 192
                });
                inputPoint.gain.value = 0.5;
                initialize();
            }, function (e) {
                alert("Error getting audio.");
                $(".start").addClass("disabled");
                console.log(e);
            });
        }
        startCapture(defaultConfig);

        var wavesurfer = Object.create(WaveSurfer);

        $(".start").click(function (e) {
            var btn = $(this);
            if (btn.hasClass("disabled")) {
                return;
            }
            if (btn.hasClass("stop")) {
                e.preventDefault();

                updateWave = false;
                recorder.stop();
                $(".length .total").text(getTimeString(timeLength / 1000));
                $(".length .running").text("00:00");
                btn.removeClass("stop");
                btn.addClass("play");
                btn.addClass("disabled");
                //disable pause while recording per comment in VR-170
                $(".pause").hide();

                //get MP3
                clearInterval(timer);
                recorder.getMp3Blob(function (blob) {
                    blobToDataUrl(blob, function (url) {
                        this.url = url;

                        var link = $(".save")[0];
                        link.href = url;
                        link.download = "VR.mp3";
                        $(".progress").hide();
                        $(".save").show();

                        $(".save").on("click", function (e) {
                            e.preventDefault();
                            $(".save").hide();
                            $(".uploading").show();
                            var fd = new FormData();
                            var duration = getTimeString(timeLength / 1000);
                            fd.append("recordName", "VR.mp3");
                            fd.append("duration", duration);
                            fd.append("data", blob);
                            $.ajax({
                                type: "POST",
                                url: location.origin + "/audiorecorder/upload.aspx",
                                data: fd,
                                processData: false,
                                contentType: false
                            }).done(function (res) {
                                $(".uploading").hide();
                                if (res.startsWith("save=ok")) {
                                    // onUploadDone function is in page script block
                                    onUploadDone(true);
                                    $(".savedone").show();
                                } else {
                                    onUploadDone(false);
                                }
                                if (typeof callback === "function") {
                                    callback(res);
                                }
                            });
                        });

                        $(".again").show();
                        $("#wave-container").empty();
                        $(".tip").hide();
                        $(".waveform").show();
                        wavesurfer.init({
                            container: document.querySelector("#wave-container"),
                            waveColor: "#7B7B7B",
                            progressColor: "#7A212E",
                            cursorWidth: 0,
                            height: $("#wave-container").height(),
                            hideScrollbar: true,
                            audioContext: audioContext,
                            normalize: true
                        });
                        wavesurfer.on("ready", function () {
                            btn.removeClass("disabled");
                            wavesurfer.setVolume(1);
                        });
                        // two options to load the wavesurver - blob or url
                        //wavesurfer.load(url);
                        wavesurfer.loadBlob(blob);
                    });
                }, function (e) {
                    alert("We could not retrieve your message");
                    console.log(e);
                });
            }
            else if (btn.hasClass("play")) {
                btn.removeClass("play");
                btn.addClass("play-pause");
                wavesurfer.play();
                var running = 0;
                replayInterval = setInterval(function () {
                    running += 100;
                    if (running >= timeLength) {
                        running = timeLength;
                        clearInterval(replayInterval);
                        $(".play-pause").click();
                    }
                    $(".length .running").text(getTimeString(running / 1000));
                }, 100);
            }
            else if (btn.hasClass("play-pause")) {
                $(this).removeClass("play-pause");
                $(this).addClass("play");
                clearInterval(replayInterval);
                $(".length .running").text("00:00");
                wavesurfer.stop();
            }
            else { // Default, record.
                e.preventDefault();

                timeLength = 0;
                btn.addClass("stop");
                startWaveform();
                updateWave = true;
                $(".tip").hide();
                $(".waveform").show();
                $(".pause").hide();

                recorder.start(function () {
                    var seconds = 0, updateTimer = function () {
                                         $(".length .running").text(getTimeString(seconds));
                                     };
                    timer = setInterval(function () {
                        seconds++;
                        updateTimer();
                    }, 1000);
                    updateTimer();
                }, function () {
                    alert("We could not make use of your microphone at the moment");
                });
            }
        });

        function blobToDataUrl(blob, callback) {
            var a = new FileReader();
            a.onload = function (e) {
                callback(e.target.result);
            }
            a.readAsDataURL(blob);
        }

        function initialize() {
            updateWave = false;
            $(".length .total").text(getTimeString(maxAudioLength / 1000));
            $(".length .running").text(getTimeString(0));
            $(".start").removeClass("play");
            $(".start").removeClass("stop");
            $(".start").removeClass("play-pause");
            $(".start").removeClass("disabled");
            $(".progress").hide();
            $(".waveform").empty();
            $(".waveform").hide();
            $(".save").hide();
            $(".pause").removeClass("resume");
            $(".pause").hide();
            $(this).hide();
            $(".tip").show();
            $(".savedone").hide();
            clearInterval(replayInterval);
        }

        /**
        * Event handler for the record again button.
        */
        $(".again").click(function () {
            initialize();
        });

        /**
	     * Event handler for change volume.
	     */
        $(".volume").change(function () {
            inputPoint.gain.value = $(this).val();
        });

        /**
	     * Event handler for open setting modal.
	     */
        $(".change-setting").click(function () {
            if ($(".start").hasClass("disabled")) {
                return false;
            }
            $(".modal").show();
        });

        /**
	     * Event handler for close setting modal.
	     */
        $(".modal .close").click(function () {
            $(".modal").hide();
        });

        /**
	     * Event handler for change echo setting.
	     */
        $(".config .echo input").change(function () {
            var echo = !$(this).is(":checked");
            var config = jQuery.extend({}, defaultConfig);
            config["audio"]["mandatory"]["echoCancellation"] = echo;
            startCapture(config);
        });

        // functions.
        /**
	     * Get a time format string like 10:30 of the given seconds.
	     * 
	     * @param sec
	     *          the seconds.
	     * @return the formatted string.
	     */
        function getTimeString(sec) {
            var minutes = Math.floor(sec / 60);
            var seconds = Math.round(sec) % 60;
            minutes = (minutes >= 10 ? "" : "0") + minutes;
            seconds = (seconds >= 10 ? "" : "0") + seconds;
            return minutes + ":" + seconds;
        }
    }
})(jQuery);