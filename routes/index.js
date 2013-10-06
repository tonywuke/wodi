var crypto = require('crypto');
var config = require('../config');
var util = require('../util');
var Room = require('../models/room');
var Player = require('../models/player');

var writeLog = util.writeLog;
var wxTextRes = util.wxTextRes;
var isNum = util.isNum;
var randomNum = util.randomNum;
var trim = util.trim;

var rooms = {};

var WODI_BEGIN = '\
开始 谁是卧底？\n\
发送:\n\
wodi 玩家数 卧底人数 白板人数\n\
例如:\n\
wodi 8 2 0';
var WODI_ROOM = '\
告诉小伙伴们房间ID，加入房间，发送:\n\
wodiroom 房间ID 昵称\n\
例如:\n\
wodiroom 9999 小白';
var WODI_KILL = '\
知道哪个小伙伴是卧底了？\n\
揭穿ta吧，发送:\n\
wodiout 小伙伴ID\n\
例如:\n\
wodiout 9';

exports.checkToken = function(req, res, next){

    var signature = req.query['signature'];
    var timestamp = req.query['timestamp'];
    var nonce = req.query['nonce'];
    var echostr = req.query['echostr'];

    var keys = [];
    keys.push(nonce);
    keys.push(timestamp);
    keys.push(config.token);
    keys.sort();

    var sha1 = crypto.createHash('sha1');
    sha1.update(keys.join(''), 'utf8');
    var result = sha1.digest('hex')

    if(signature == result){
        if(req.method == 'GET')
            return res.end(echostr);
        next();
    }else{
        return res.end('403...');
    }
}


exports.get = function(req, res){
    res.send('where are you from ?');
};

exports.post = function(req, res){
    console.log('-----------------  body xml    --------------------');
    for(var i in req.body.xml){
        console.log(i+'------'+req.body.xml[i]);
    }
    console.log('-----------------  rooms   --------------------');
    for(var i in rooms){
        console.log(i+'------'+rooms[i].host+'-----'+rooms[i].players.length);
    }
    console.log('------------------------------------------------------');
    console.log('------------------------------------------------------');
    console.log('------------------------------------------------------');

    var msg = req.body.xml;
    var resStr = '';

    msg.Content = trim(msg.Content.toString());
    msg.FromUserName = trim(msg.FromUserName.toString());
    msg.ToUserName = trim(msg.ToUserName.toString());

    if(msg.Content.indexOf('wodi') == 0){

        var cmd = msg.Content.split(' ');

        switch(cmd.length){
            case 1:
                if(cmd[0] == 'wodi'){
                    resStr = WODI_BEGIN;
                }else if(cmd[0] == 'wodistatus'){
                    var room = null;
                    for(var r in rooms){
                        if(rooms[r].host == msg.FromUserName)
                            room = rooms[r];
                    }
                    if(room){
                        resStr = room.status();
                    }else{
                        resStr = '你是房间的创建者吗？让ta来发这个命令吧';
                    }
                }else if(cmd[0] == 'wodiover'){
                    var room = null;
                    for(var r in rooms){
                        if(rooms[r].host == msg.FromUserName)
                            room = rooms[r];
                    }
                    if(room){
                        resStr = room.over();
                        delete rooms[room.id];
                    }else{
                        resStr = '你是房间的创建者吗？让ta来发这个命令吧';
                    }
                }
                
                break;
            case 2:
                if(cmd[0] == 'wodiout'){
                    var room = null;
                    for(var r in rooms){
                        if(rooms[r].host == msg.FromUserName)
                            room = rooms[r];
                    }
                    if(room){
                        if(isNum(cmd[1])){
                            resStr = room.out(cmd[1]);
                        }else{
                            resStr = '小伙伴ID 必须是数字！';
                        }
                    }else{
                        resStr = '你是房间的创建者吗？让ta来发这个命令吧';
                    }
                }else{
                    resStr = WODI_BEGIN;
                }
                
                break;
            case 3:
                if(cmd[0] == 'wodiroom'){
                    if(isNum(cmd[1]) && rooms[cmd[1]]){
                        var room = rooms[cmd[1]];
                        var player = new Player(msg.FromUserName, cmd[2]);
                        resStr = room.addPlayer(player);
                    }else{
                        resStr = '房间ID 不对！';
                    }
                }
                break;
            case 4:
                if(isNum(cmd[1]) && isNum(cmd[2]) && isNum(cmd[3])){
                    var id = randomNum(4);
                    var room = new Room(id, msg.FromUserName);
                    room.playerNum = parseInt(cmd[1]);
                    room.spyNum = parseInt(cmd[2]);
                    room.nullNum = parseInt(cmd[3]);

                    if(room.valid()){
                        resStr = room.valid();
                        break;
                    }

                    room.init();

                    resStr = '房间创建成功，ID:'+id+';让小伙伴们发送：wodiroom 房间ID 昵称;\n例如：\n'+
                            'wodiroom '+id+' 小白\n';

                    var player = new Player(msg.FromUserName, '主持人');
                    resStr += room.addPlayer(player);
                    rooms[id] = room;
                    
                }else{
                    resStr = '玩家数 卧底人数 白板人数 必须是数字！';
                }
                break;
            default:
                resStr = '你想干嘛？玩 谁是卧底 吗？开始吧。\n'+WODI_BEGIN;
        }

    }else{
        resStr = '收到你发过来的:'+msg.Content;
    }

    console.log('-------reponse:---------\n' + resStr);
    res.send(wxTextRes(msg.FromUserName, msg.ToUserName, resStr));
};

var s = setInterval(function(){
    cleanRoom(rooms);
}, 100000);

var cleanRoom = function(rooms){
    for(var i in rooms){
        console.log(rooms[i].update);
        if(new Date().getTime() - rooms[i].update > 30*60*1000)
        {
            console.log('==========cleanRoom time:'+new Date().getTime());
            console.log('==========cleanRoom :'+i);
            delete rooms[i];
        }
    }
}