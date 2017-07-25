/**
 * Created by ryeubi on 2015-08-31.
 * Updated 2017.03.06
 * Made compatible with Thyme v1.7.2
 */


var gpio = require('rpi-gpio');
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

// This is an async file read
fs.readFile('conf.xml', 'utf-8', function (err, data) {
    if (err) {
        console.log("FATAL An error occurred trying to read in the file: " + err);
        console.log("error : set to default for configuration")
    }
    else {
        var parser = new xml2js.Parser({explicitArray: false});
        parser.parseString(data, function (err, result) {
            if (err) {
                console.log("Parsing An error occurred trying to read in the file: " + err);
                console.log("error : set to default for configuration")
            }
            else {
                var jsonString = JSON.stringify(result);
                conf = JSON.parse(jsonString)['m2m:conf'];
				

                useparenthostname = conf.tas.parenthostname;
                useparentport = conf.tas.parentport;

				if(conf.upload != null) {


				if (conf.upload['ctname'] != null) {
				upload_arr[0] = conf.upload;
				}
				else {
					upload_arr = conf.upload;

   
					}
                }

                if(conf.download != null) {
                    if (conf.download['ctname'] != null) {
                        download_arr[0] = conf.download;
                    }
                    else {
                        download_arr = conf.download;
                    }
                }
            }
        });
    }
});


var tas_state = 'init';

var upload_client = null;

var t_count = 0;

var tas_download_count = 0;

function on_receive(data) {
    if (tas_state == 'connect' || tas_state == 'reconnect' || tas_state == 'upload') {
        var data_arr = data.toString().split('<EOF>');
        if(data_arr.length >= 2) {
            for (var i = 0; i < data_arr.length - 1; i++) {
                var line = data_arr[i];
                var sink_str = util.format('%s', line.toString());
                var sink_obj = JSON.parse(sink_str);

                if (sink_obj.ctname == null || sink_obj.con == null) {
                    console.log('Received: data format mismatch');
                }
                else {
                    if (sink_obj.con == 'hello') {
                        console.log('Received: ' + line);

                        if (++tas_download_count >= download_arr.length) {
                            tas_state = 'upload';
                        }
                    }
                    else {
                        for (var j = 0; j < upload_arr.length; j++) {
                            if (upload_arr[j].ctname == sink_obj.ctname) {
                                console.log('ACK : ' + line + ' <----');
                                break;
                            }
                        }

                        for (j = 0; j < download_arr.length; j++) {
                            if (download_arr[j].ctname == sink_obj.ctname) {
                                g_down_buf = JSON.stringify({id: download_arr[i].id, con: sink_obj.con});
                                console.log(g_down_buf + ' <----');
                                control_led(sink_obj.con);
                                break;
                            }
                        }
                    }
                }
            }
        }
    }
}

function send_to_thyme(_ctname, _con)
{
	var cin = {ctname : _ctname, con : _con };
	upload_client.write(JSON.stringify(cin)+'<EOF>');

}


function init_light()
{
	console.log('init_light');
	gpio.setup(11,gpio.DIR_OUT,function(err){
			gpio.write(11,gpio.DIR_HIGH);
			});
	gpio.setup(12,gpio.DIR_OUT,function(err){
			gpio.write(12,gpio.DIR_HIGH);
			});
	gpio.setup(13,gpio.DIR_OUT,function(err){
			gpio.write(13,gpio.DIR_HIGH);
			});

}



function green_light_on()
{

	console.log('green_light_on');
	
	
	gpio.setup(11, gpio.DIR_HIGH, function(err){
		if(err) throw err;
	});

	gpio.setup(13,gpio.DIR_LOW, function(err){
			if(err) throw err;
			
			gpio.read(13,function(err,value){
			console.log('The green light value is '+value);
			send_to_thyme('green_light','on');
			});
	});
	
}

function green_light_off()
{

	console.log('green_light_off');
	
	gpio.setup(11, gpio.DIR_HIGH, function(err){
		if(err) throw err;
	});

	gpio.setup(13,gpio.DIR_HIGH, function(err){
			if(err) throw err;
			gpio.read(13,function(err,value){
			console.log('The green light value is '+value);
			send_to_thyme('green_light','off');
			});	
	});
	
}


function blue_light_on()
{

	console.log('blue_light_on');
	gpio.setup(11, gpio.DIR_HIGH, function(err){
		if(err) throw err;
	});
	gpio.setup(12,gpio.DIR_LOW,function(err){
			if(err) throw err;
			gpio.read(12,function(err,value){
			console.log('The value is '+value);
			send_to_thyme('blue_light','on');
		
		});
	});
	
}

function blue_light_off()
{

	console.log('blue_light_off');
	
	gpio.setup(11, gpio.DIR_HIGH, function(err){
		if(err) throw err;
	});
	gpio.setup(12,gpio.DIR_HIGH, function(err){
			if(err) throw err;
	gpio.read(12,function(err,value){
		console.log('The value is '+value);
		send_to_thyme('blue_light','off');
		
		});
	});
}
function control_led(comm_num){
	
	console.log('control_led comm_num : '+comm_num);	
	switch(comm_num)
	{
		case '1':
			green_light_on();
			break;
		case '2':
			green_light_off();
			break;
		case '3':
			blue_light_on();
			break;
		case '4':
			blue_light_off();
			break;
	}
	/*
    var cmd = 'sudo ./led ' + comm_num;
    exec(cmd, function callback(error, stdout, stderr) {
        console.log(stdout);
    });
	*/
	

}

var Serial = null;
var myPort = null;
function tas_watchdog() {
    if(tas_state == 'init') {
        upload_client = new net.Socket();
		
		//add
		init_light();
        upload_client.on('data', on_receive);

        upload_client.on('error', function(err) {
            console.log(err);
            tas_state = 'reconnect';
        });

        upload_client.on('close', function() {
            console.log('Connection closed');
            upload_client.destroy();
            tas_state = 'reconnect';
        });

        if(upload_client) {
            console.log('tas init ok');
            tas_state = 'init_thing';
        }
    }
    else if(tas_state == 'init_thing') {
        control_led('0');
        
        tas_state = 'connect';
    }
    else if(tas_state == 'connect' || tas_state == 'reconnect') {
        upload_client.connect(useparentport, useparenthostname, function() {
            console.log('upload Connected');
            tas_download_count = 0;
            for (var i = 0; i < download_arr.length; i++) {
                console.log('download Connected - ' + download_arr[i].ctname + ' hello');
                var cin = {ctname: download_arr[i].ctname, con: 'hello'};
        		console.log('cin');
			 	console.log(cin);	
		   
				upload_client.write(JSON.stringify(cin) + '<EOF>');
            }

            if (tas_download_count >= download_arr.length) {
                tas_state = 'upload';
            }
        });
    }
}

wdt.set_wdt(require('shortid').generate(), 3, tas_watchdog);

var cur_c = '';
var pre_c = '';
var g_sink_buf = '';
var g_sink_ready = [];
var g_sink_buf_start = 0;
var g_sink_buf_index = 0;
var g_down_buf = '';

