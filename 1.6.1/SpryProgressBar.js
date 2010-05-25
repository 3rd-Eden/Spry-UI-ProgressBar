var Spry;
if (!Spry) Spry = {};
if (!Spry.Widget) Spry.Widget = {};

Spry.Widget.ProgressBar = function( element, opts ){
	var that = this;

	Spry.Utils.Notifier.call(this);

	Spry.Widget.ProgressBar.setOptions(this, Spry.Widget.ProgressBar.config);

	Spry.Widget.ProgressBar.setOptions(this, opts);

	this.version = "0.1.0";	// version number pattern: major, minor, bugfix
	this.element = Spry.$$( element )[0];
	this.bar = Spry.$$( "." + this.barClass, this.element );
	this.initialWidth = Spry.Effect.getDimensionsRegardlessOfDisplayState( this.bar[0], this.displayElement || this.bar[0] ).width;
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
		if (time > duration) return change + begin;
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

Spry.Widget.ProgressBar.setOptions = function( obj, optionsObj, ignoreUndefinedProps ){
	if (!optionsObj) return;
	
	var optionName;	
	for ( optionName in optionsObj )
	{
		if ( ignoreUndefinedProps && optionsObj[optionName] == "undefined" )
			continue;
			
		obj[optionName] = optionsObj[optionName];
	}
};

Spry.Widget.ProgressBar.prototype = new Spry.Utils.Notifier();
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
	this.effect = new Spry.Effect.Slide( this.bar[0], {
			duration: duration,
			from: this.currentWidth + "px",
			to: to + "px",
			horizontal: true,
			transition: this.transition, 
			finish: callback || null 
	});
	
	this.currentWidth = to;
	this.percentage = percentage;
	
	// add events to the effect so we can fire off our custom notifications as well
	this.effect.addObserver({
		onPostEffect: function(){
			if( percentage === 100 ){
				that.notifyObservers( "onComplete" ); // the progressbar has been completed
			}
			
			// we set the percentage
			that.notifyObservers( "onPercentageChanged", ( that.counter = percentage ) );
			that.notifyObservers( "onPercentageSet", that.percentage );
		},
		
		onStep: function( effect, info ){			
			if( info.getElapsedMilliseconds() >= effect.increase && !( that.counter >= 100 ) ){
				effect.increase = effect.avg + effect.increase;
				
				var _percent = Math.floor( info.getElapsedMilliseconds() / effect.avg ),
					_difference;
					
				if( !effect.percent || effect.percent < _percent ){
					_difference = _percent - effect.percent || 1;
					effect.percent = _percent;
					
					that.notifyObservers( 
						"onPercentageChanged",
						( 
							that.counter = that.cleanPercentage( 
								increase ? ( that.counter + _difference ) : ( that.counter - _difference) 
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
	this.effect.stop();
};

// when you stop, you might want to start it again.. go figure :0
Spry.Widget.ProgressBar.prototype.start = function(){
	this.effect.start();
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
	this.setPercentage( 100, duration || 200 );
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
	if( this.hidden ){
		this.hidden = false;
		this.element.style.display = "";
		Spry.Effect.DoFade(
			this.element, 
			{ 
				from:0, 
				to:100,
				duration:500
			}
		)
	}
};

// hides the widget
Spry.Widget.ProgressBar.prototype.hide = function(){
	var self = this;
	this.hidden = true;
	Spry.Effect.DoFade(
		this.element, 
		{ 
			from:100,
			to: 0,
			duration:500,
			finish: function(){
				self.element.style.display = "none";
			}
		}
	)
};