let url = `${我是接口地址}/`;
let device_status_history = url + 'api-device/device/status/history'; //查询历史记录
let getChannelDetail = url + 'api-device/device/status'; //查询通道数据
let sendCmdtoDevice = url + 'api-device/device/operation'; // 下发指令
let schedule = url + 'gzdsp/cmd/schedule'; //自检指令
// websocket电平数据
// let ws_url = 'ws://192.168.30.66:18115/gzdsp/websocket';
let ws_url = `${我是websocket地址}`;
let user_info_url = `${url}api-auth/oauth/userinfo`; //获取用户信息
