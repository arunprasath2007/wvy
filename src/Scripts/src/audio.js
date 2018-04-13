﻿var weavy = weavy || {};
weavy.audio = (function ($) {

    function play(sound) {        
        try {
            $(sound)[0].play();
        } catch (e) {
            console.error("Unable to play sound " + sound);
        }
    }

    function stop(sound) {
        try {
            $(sound)[0].pause();
            $(sound)[0].currentTime = 0;
        } catch (e) {
            console.error("Unable to stop sound " + sound);
        }
    }

    return {
        play: play,
        stop: stop
    };

})($);
