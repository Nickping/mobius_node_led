var net = require('net');
var util = require('util');
var fs = require('fs');
var xml2js = require('xml2js');
var exec = require("child_process").exec;
var wdt = require('./wdt');
var useparentport = '';
var useparenthostname = '';
var upload_arr = [];
var download_arr = [];
var conf = {};
var gpio = require('rpi-gpio');

var client = null;


var VCC_PIN = 0;
var GREEN_PIN = 1;
var BLUE_PIN = 2;


function socket_init(error)
{
	var cin = {ctname : 'message from client ctname', con : 'message from client con'};

	client = new net.Socket();	
	if(!error)
	{
		console.log('init');
		client.connect({port: 3105, host : 'localhost'}, function(){
				console.log('Client connect');
				client.write(JSON.stringify(cin)+'<EOF>');
				});
	}
}
gpio.setup(11, gpio.DIR_IN);
gpio.setup(12, gpio.DIR_IN);
gpio.setup(13, gpio.DIR_IN);

function green_light_on()
{}
function blue_light_on()
{}
function red_light_on()
{}
function init_light()
{}

function main()
{
	process.argv.forEach(function(val, index, aray){
			console.log(index + ' : ' + val);
			});
}
socket_init();
