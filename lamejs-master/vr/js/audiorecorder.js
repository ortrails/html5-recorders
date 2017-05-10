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

        var recorder = new MP3Recorder({
            bitRate: 128
        }), timer;

		window.AudioContext = window.AudioContext || window.webkitAudioContext;
	    audioContext = new AudioContext();
	    if (!navigator.getUserMedia) {
	        navigator.getUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
	    }

        $('.start').click(function(e) {
			var btn = $(this);
			if (btn.hasClass('disabled')) {
	            return;
	        }
	        if (btn.hasClass('stop')) {
			}
			else if (btn.hasClass('play')) {
			}
			else if (btn.hasClass('play-pause')) {
			}
			else { // Default, record.
				e.preventDefault();
				
				recorder.start(function () {
					//start timer,
					var seconds = 0, updateTimer = function(){
						$('#timer').text(seconds < 10 ? '0' + seconds : seconds);
					};
					timer = setInterval(function () {
						seconds++;
						updateTimer();
					}, 1000);
					updateTimer();
					//disable start button
					btn.attr('disabled', true);
					$('#stopBtn').removeAttr('disabled');
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
    }
})(jQuery);
