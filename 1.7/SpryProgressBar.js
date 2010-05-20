"use strict";

(function(){
// start component
if (typeof Spry === "undefined" || !Spry.Utils || !Spry.$$ || !Spry.Effect ){
	throw new Error("SpryProgessbar.js requires SpryDOMUtils.js and SpryDOMEffects.js");
}
	
Spry.Widget.ProgressBar = function( element, opts ){
	var that = this;
	
	Spry.Widget.Base.call( this ); 
	
	// Initialize the button object with the global defaults.
	this.setOptions( this, Spry.Widget.ProgressBar.config );
	
	// Override the defaults with any options passed into the constructor.
	this.setOptions( this, opts );
	
	// version number pattern: major, minor, bugfix
	this.version = "0.0.0";	
	this.element = Spry.$$( element )[0];
	this.bar = Spry.$$( "." + this.barClass, this.element );
	this.initialWidth = parseFloat( this.getStyleProp( this.bar[0], "width" ) ); // getStylePr
	this.currentWidth = this.initialWidth;
	this.counter = 0;
	
	// this activates or resets the progress with the supplied value
	this.setPercentage( 
		// set the percentage to the supplied "default" percentage
		this.percentage, 
		
		// just do it quick so user will not notice it
		1, 
		
		// do we have a auto start ? if yes, complete the progress bar with the supplied duration
		this.autoStart ? function(){ that.setPercentage( 100, that.duration ); }: false );
	
	// adds on oncomplete observer to show or hide the menubar
	this.addObserver({
		onComplete: function(){
			if( that.hideOnComplete ){
				that.hide();
			}
		}
	});
};

// a linear transition
Spry.Widget.ProgressBar.defaultEaseFunc =  function(time, begin, change, duration){
	if (time > duration){ 
		return change + begin;
	}
	
	return begin + (time / duration) * change;
};

Spry.Widget.ProgressBar.config = {
	// initial percentage of the bar
	percentage: 0,
	
	// default transition for the effect
	transition:	Spry.Widget.ProgressBar.defaultEaseFunc,
	
	// the default length of the animation
	duration: 2E3,
	
	// is the widget enabled or disabled
	autoStart: false,
	
	// if the progress bar should be hidden once it's completed
	hideOnComplete: true,
	
	// what className is used for the bar
	barClass: "bar"
};

Spry.Widget.ProgressBar.prototype = new Spry.Widget.Base();
Spry.Widget.ProgressBar.prototype.constructor = Spry.Widget.ProgressBar;

Spry.Widget.ProgressBar.prototype.setPercentage = function( percentage, duration, callback ){
	// makesure its a valid value
	percentage = this.cleanPercentage ( percentage ); 
	duration = duration || this.duration;
					
	var that = this,
		// are we increasing or decreasing
		increase = percentage >= this.percentage,
		
		// target width	
		to = this.initialWidth / 100 * percentage,	
		
		// diffence between the current and new percentage
		difference = increase ? percentage - this.percentage : this.percentage - percentage;
		
	// create sliding effect
	this.effect = new Spry.Effect.CSSAnimator( this.bar, "width:" + to + "px", {
			duration: duration,
			easeFunc: this.transition || Spry.$$.Results.defaultEaseFunc, 
			onComplete: callback || null 
	});
	
	this.currentWidth = to;
	this.percentage = percentage;
	
	// add events to the effect so we can fire off our custom notifications as well
	this.effect.addObserver({
		onAnimationComplete: function(){
			if( percentage === 100 ){
				that.notifyObservers( "onComplete" ); // the progressbar has been completed
			}
			
			// we set the percentage
			that.notifyObservers( "onPercentageChanged", ( that.counter = percentage ) );
			that.notifyObservers( "onPercentageSet", that.percentage );
		},
		
		onPostDraw: function( effect, info ){
			if( info.elapsed >= effect.increase && that.counter < 100 ){
				effect.increase = effect.avg + effect.increase;
				
				var effect_percent = Math.floor( info.elapsed / effect.avg ),
					effect_difference;
				
				if( !effect.percent || effect.percent < effect_percent ){
					effect_difference = effect_percent - effect.percent || 1;
					effect.percent = effect_percent;
					
					that.notifyObservers( 
						"onPercentageChanged",
						( 
							that.counter = that.cleanPercentage( 
								increase ? ( that.counter + effect_difference ) : ( that.counter - effect_difference) 
							)
						) 
					);
				}
				
			}
		}
		
	});
	
	// calculate the elapsed when the percentage needs to increased
	this.effect.avg = this.effect.increase= Math.round( duration / difference );
	
	// run the animation
	this.effect.start();
};

// prevent race conditions, so you can stop them at will... 
Spry.Widget.ProgressBar.prototype.stop = function(){
	if( this.effect && !this.effect.stopped){
		this.effect.stop();
	}
};

// when you stop, you might want to start it again.. go figure :0
Spry.Widget.ProgressBar.prototype.start = function(){
	if( this.effect && this.effect.stopped){
		this.effect.start();
	}
};

// increase the value of the progress
Spry.Widget.ProgressBar.prototype.add = function( percentage, duration ){
	percentage = percentage ? this.cleanPercentage( percentage ) : 5;
	this.setPercentage( this.counter + percentage, duration );
};

// decrease the value of the progress
Spry.Widget.ProgressBar.prototype.remove = function( percentage, duration ){
	percentage = percentage ? this.cleanPercentage( percentage ) : 5;
	this.setPercentage( this.counter - percentage, duration );
};

// reset the progress bar back to 0;
Spry.Widget.ProgressBar.prototype.reset = function( ){
	var that = this;
	
	if( this.hidden ){
		this.show();
	}
	
	this.counter = 0;
	this.setPercentage( 0, 1, function(){ that.notifyObservers( "onReset" ); });
};

// complete the progress bar, fast
Spry.Widget.ProgressBar.prototype.complete = function( duration ){
	this.stop();
	this.setPercentage( 100, duration || 200, false, true );
};

// cleans out the percentage, parses down 100% to 100 and makes sure its between 0 and 100;
Spry.Widget.ProgressBar.prototype.cleanPercentage = function( value ){
	value = typeof value === "number" ? value : parseFloat( value.replace(/\%/g, '' ) );
	return value > 100 ? 100 : (value < 0 ? 0 : value); // percentage can't be higher than 100%
};

// returns the current percentage or the expected percentage
Spry.Widget.ProgressBar.prototype.getPercentage = function( total ){
	return total ? this.percentage : this.counter;
};

// shows the widget
Spry.Widget.ProgressBar.prototype.show = function(){
	this.element.style.display = "";
	if( this.hidden ){
		this.hidden = false;
		(new Spry.Effect.CSSAnimator( this.element , "opacity: 1", 
				{ 
					duration: 500
				})
		).start();
	}
};

Spry.Widget.ProgressBar.prototype.hide = function(){
	var that = this;
	this.hidden = true;
	
	(new Spry.Effect.CSSAnimator( this.element , "opacity: 0", 
			{ 
				duration: 500, 
				onComplete: function(){
					that.element.style.display = "none";
				}
			})
	).start();
};

// end component 
}());