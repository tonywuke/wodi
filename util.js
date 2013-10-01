var fs = require('fs');
var xml2js = require('xml2js');
var xmlbuilder = require('xmlbuilder');

var accessLogFile = fs.createWriteStream('access.log', {
    flags: 'a'
});

function mime(req){
	var type = req.headers['content-type'] || '';
	return type.split(';')[0];
};

var parseXmlBody = function(req, res, next){
	console.log('--------parseXmlBody------' + req._body);
	console.log('--------parseXmlBody------' + mime(req));

	// if(req._body)
	// 	return next();

	if(req.method == 'GET' ||
		req.method == 'HEAD')
		return next();

	req.body = req.body || {};

	if(mime(req) != 'text/xml')
		return next();
	// req._body = true;

	var buf = '';
	req.setEncoding('utf8');
	req.on('data', function(chunk){
		buf += chunk;
	});
	req.on('end', function(){
		console.log('---POST---BODY:' + buf);
		var parser = xml2js.Parser();
		parser.parseString(buf, function(err, json){
			if(err){
				err.status = 400;
				next(err);
			}else{
				req.body['xml'] = json.xml;
				next();
			}
		});
	});
};	

var writeLog = function(logPath, prefix, log){
	fs.appendFile(logPath, '\n['+ new Date() +']['+prefix+']'+log, 
		function(err){
		if(err)
			return res.end('write file error...');
	});	
}

var wxTextRes = function(to, from, content){
    var xml = xmlbuilder.create('xml')
        .ele('ToUserName')
        .dat(to)
        .up()
        .ele('FromUserName')
        .dat(from)
        .up()
        .ele('CreateTime')
        .txt(new Date().getTime())
        .up()
        .ele('MsgType')
        .dat('text')
        .up()
        .ele('Content')
        .dat(content)
        .up()
        .end({ 'pretty': true, 'indent': '  ', 'newline': '\n' });
    return xml;
}
exports.accessLogFile = accessLogFile;
exports.parseXmlBody = parseXmlBody;
exports.writeLog = writeLog;
exports.wxTextRes = wxTextRes;