let url = `${我是接口地址}/`;
// let url = 'http://iot.china-hushan.com/';
let getChannelDetail = url + 'api-device/device/status'; //查询历史记录
let sendCmdtoDevice = url + 'api-device/device/operation'; // 下发指令
let user_info_url = `${url}api-auth/oauth/userinfo`; //获取用户信息

new Vue({
    el: '#wireless',
    mixins: [common_functions],
    data:{
        id:'', //设备ID
        device_name: '', //显示在页面的设备名
		productId: '', //产品ID
        token:'',
        ws_name:null, //websocket用户名
        ws_password:null,//websocket密码
        user_id:null,
        ws_link:null,
        stomp_link:null,
        dialogVisible:false,
        deviceChannelNum:2,
        setChan:'',
        setDeviceFreq:null,
        dialogData:{},
        disabledVol:null,
        disabledSQ:null,
        groupValue:null,
        chValue:null,
        timerNum:null,
        groupData:[{
            value:1,
            lable:1
        },{
            value:2,
            lable:2
        },{
            value:3,
            lable:3
        },{
            value:4,
            lable:4
        },{
            value:5,
            lable:5
        },{
            value:6,
            lable:6
        },{
            value:7,
            lable:7
        },{
            value:8,
            lable:8
        },{
            value:'U',
            lable:'U'
        }],
        chData:[{
            value:1,
            lable:1
        },{
            value:2,
            lable:2
        },{
            value:3,
            lable:3
        },{
            value:4,
            lable:4
        },{
            value:5,
            lable:5
        },{
            value:6,
            lable:6
        },{
            value:7,
            lable:7
        },{
            value:8,
            lable:8
        },{
            value:9,
            lable:9
        },{
            value:10,
            lable:10
        },{
            value:11,
            lable:11
        },{
            value:12,
            lable:12
        },{
            value:13,
            lable:13
        },{
            value:14,
            lable:14
        },{
            value:15,
            lable:15
        },{
            value:16,
            lable:16
        },{
            value:17,
            lable:17
        },{
            value:18,
            lable:18
        },{
            value:19,
            lable:19
        },{
            value:20,
            lable:20
        },{
            value:21,
            lable:21
        },{
            value:22,
            lable:22
        },{
            value:23,
            lable:23
        },{
            value:24,
            lable:24
        }],
        deviceData:{},
        freqArray1:[
            [642750,644000,648400,652400,653500,658950,660600,662650,668200,673500,678250,679800, 681600,684700,687600,688600],
            [640450,646050,651350,652450,654200,656200,660750,663500,667000,668650,677050,678900,680300,682850,687500,688800],
            [642100,644250,645500,647900,650900,651900,654400,658950,660350,668200,672650,678150,679900,684100,687850,689300],
            [645450,647550,649050,652300,654100,659900,662550,663750,668250,669950,671950,674200,681500,684850,686750,689500],
            [641850,650625,653150,653750,654700,655450,655900,657550,658325,660075,662375,663750,667725,668450,669725,670400,671350,673475,676025,681375,684125,686225,687075,688700],
            [641925,650700,653225,653825,654775,655525,655975,657625,658400,660150,662450,663825,667800,668525,669800,670475,671425,673550,676100,681450,684200,686300,687150,688775],
            [642000,650775,653300,653900,654850,655600,656050,657700,658475,660225,662525,663900,667875,668600,669875,670550,671500,673625,676175,681525,684275,686375,687225,688850],
            [642075,650850,653375,653975,654925,655675,656125,657775,658550,660300,662600,663975,667950,668675,669950,670625,671575,673700,676250,681600,684350,686450,687300,688925]
        ],
        freqArray2:[
            [532750,534000,538400,542400,543500,548950,550600,552650,558200,563500,568250,569800,571600,574700,577600,578600],
            [530450,536050,541350,542450,544200,546200,550750,553500,557000,558650,567050,568900,570300,572850,577500,578800],
            [532100,534250,535500,537900,540900,541900,544400,548950,556350,558200,562650,568150,569900,574100,577850,579300],
            [535450,537550,539050,542300,544100,549900,552550,553750,558250,559950,561950,564200,571500,574850,576750,579500],
            [531850,540625,543150,543750,544700,545450,545900,547550,548325,550075,552375,553750, 557725,558450,559725,560400,561350,563475,566025,571375,574125,576225,577075,578700],
            [531925,540700,543225,543825,544775,545525,545975,547625,548400,550150,552450,553825,557800,558525,559800,560475,561425,563550,566100,571450,574200,576300,577150,578775],
            [532000,540775,543300,543900,544850,545600,546050,547700,548475,550225,552525,553900,557875,558600,559875,560550,561500,563625,566175,571525,574275,576375,577225,578850],
            [532075,540850,543375,543975,544925,545675,546125,547775,548550,550300,552600,553975,557950,558675,559950,560625,561575,563700,566250,571600,574350,576450, 577300,578925]
        ]
    },
    created(){
        // this.get_device_status()
        // this.ws_name = 'webApp';
		// this.ws_password = 'webApp';
		// this.user_id = '1645636792924983298';
		// this.link_websocket();
        if (!location.search) {
			this.token = window.sessionStorage.token;
			this.id = window.sessionStorage.id;
		} else {
			this.get_token();
		}
        this.get_device_status()


        if (localStorage.hushanwebuserinfo) {
			let obj = JSON.parse(localStorage.hushanwebuserinfo);
			this.ws_name = obj.mqUser;
			this.ws_password = obj.mqPassword;
			this.user_id = obj.id;
			this.link_websocket();
		} else {
			this.get_user_info();
		}
    },
    mounted(){},
    methods:{
        // 获取用户信息包括 id 连接stomp用户名和密码
		get_user_info() {
			this.request('get', user_info_url, this.token, (res) => {
				if (res.data.head.code != 200) {
					this.$message('无法获取用户信息');
					return;
				}
				this.ws_name = res.data.data.mqUser;
				this.ws_password = res.data.data.mqPassword;
				this.user_id = res.data.data.id;
				this.link_websocket();
			});
		},

        //处理获取的设备参数
        dealDeviceData(data){
            let obj = {}
            this.$set(obj,'Status',data.status)
            this.$set(obj,'FreqCode',data.properties.Freq_Low.propertyValue / 1000  + '-' + data.properties.Freq_High.propertyValue / 1000)
            this.$set(obj,'MAC',data.properties.MAC.propertyValue)
            this.$set(obj,'IP',data.properties.ip.propertyValue)
            this.$set(obj,'Lock',data.properties.Lock.propertyValue)
            this.$set(obj,'channel',[])
            for(let i in data.properties) {
                if(i === 'A' || i === 'B' || i === 'C' || i === 'D') {
                    let params = {}
                    for(let j in data.properties[i].propertyValue) {
                        this.$set(params,j,data.properties[i].propertyValue[j].propertyValue)
                    }
                    this.$set(params,'SQ',this.dealSQ(params.SQ))
                    this.$set(params, 'valueANT', params.ANT)
                    let mute = params.Mute.toString(2)
                    this.$set(params,'IsMute',(mute & 1) == 1 ? true : false )
                    this.$set(params,'IsMicroPhoneConnect',((mute >> 1) & 1) == 0 ? true : false )
                    this.$set(params,'IsDeviceMute',((mute >> 3) & 1) == 1 ? true : false )
                    params.Battery = (params.Battery / 4) * 100
                    obj.channel.push(params)
                }
            }
            return obj
        },

        //处理SQ值
        dealSQ(number){
            let sq = 0
            if(number === 0) {
                sq = 25
            } else if(number === 1) {
                sq = 20
            } else if(number === 2) {
                sq = 15
            } else if(number === 3) {
                sq = 10
            } else if(number === 4) {
                sq = 5
            } else {
                sq = 0
            }
            return sq
        },

        // 获取设备参数
		get_device_status() {
			this.request('get', `${getChannelDetail}/${this.id}`, this.token, (res) => {
				if (res.data.head.code != 200) {
					return;
				}
				this.productId = res.data.data.productId;
                this.deviceData = this.dealDeviceData(res.data.data)
			});
		},

        //处理websocket推送通道数据
        dealwebsocketData(command,index,data) {
            if('SQ' in data[command]) {
                data[command].SQ = this.dealSQ(data[command].SQ)
            }
            if('Battery' in data[command]) {
                data[command].Battery = (data[command].Battery / 4) * 100
            }
            if(data[command].Group === 9) {
                data[command].Group = 9
                delete data[command].CH
            }
            
            if('Mute' in data[command]) {
                let mute = data[command].Mute.toString(2)
                this.$set(data[command],'IsMute',(mute & 1) == 1 ? true : false )
                this.$set(data[command],'IsMicroPhoneConnect',((mute >> 1) & 1) == 0 ? true : false )
                this.$set(data[command],'IsDeviceMute',((mute >> 3) & 1) == 1 ? true : false )
            }

            this.deviceData.channel[index] =  Object.assign(this.deviceData.channel[index],data[command])
            if(this.deviceData.channel[index].ANT === 0) {
                this.deviceData.channel[index] = Object.assign(this.deviceData.channel[index],data[command])
                this.deviceData.channel[index].ANT = 0
            } else {
                this.deviceData.channel[index] = Object.assign(this.deviceData.channel[index],data[command])
            }
            if(data[command].ANT) {
                this.deviceData.channel[index].valueANT = data[command].ANT
            }
            if(this.setChan === command){
                if('Freq' in data[command]) {
                    data[command].Freq = (data[command].Freq/1000).toFixed(3)
                }
                if('SQ' in data[command]) {
                    this.disabledSQ = data[command].SQ
                }
                if('Vol' in data[command]) {
                    this.disabledVol = data[command].Vol
                }
                if('CH' in data[command] || ('Group' in data[command] && data[command].Group !== 9)) {
                    this.groupValue = data[command].Group === 9 ? 'U' : data[command].Group;
                    this.chValue = data[command].CH
                }

            
                if(data[command].ANT) {
                    this.dialogData.valueANT = data[command].ANT
                }
                
                
                if(this.dialogData.ANT === 0) {
                    this.dialogData = Object.assign(this.dialogData,data[command])
                    this.dialogData.ANT = 0
                } else {
                    this.dialogData = Object.assign(this.dialogData,data[command])
                }
            }
        },

        //websocket连接
        link_websocket() {
            // this.ws_link = new WebSocket('ws://iot.china-hushan.com:15674/ws');
			this.ws_link = new WebSocket(`${我是websocket地址}`);
			this.stomp_link = Stomp.over(this.ws_link);
			this.stomp_link.debug = null;
			this.stomp_link.connect(this.ws_name, this.ws_password, this.on_message, this.on_error, '/');
		},

        // stomp连接成功的回调
		on_message() {
			let d = {
				closeValue: [0],
				deviceMessageDTO: {
					contentType: 2,
					contents: [
						{
							deviceId: this.id,
							identifier: '',
							attributes: {
								
							},
						},
					],
				},
				fieldPath: '',
				topicId: 0,
			};
			this.request('put', sendCmdtoDevice, this.token, d);
			this.stomp_link.subscribe(
				`/exchange/device-report/device-report.${this.id}`,
				(res) => {
                    let data = JSON.parse(res.body);
                    if('Lock' in data.contents[0].attributes) {
                        this.deviceData.Lock = data.contents[0].attributes.Lock
                    }  
                    if('ip' in data.contents[0].attributes) {
                        this.deviceData.IP = data.contents[0].attributes.ip
                    }
                    if('MAC' in data.contents[0].attributes) {
                        this.deviceData.MAC = data.contents[0].attributes.MAC
                        this.deviceData.Status = 1
                    }
                    if('Freq_Hign'in data.contents[0].attributes) {
                        this.deviceData.FreqCode = data.contents[0].attributes.Freq_Low / 1000  + '-' + data.contents[0].attributes.Freq_Hign / 1000
                    }
                    if('A' in data.contents[0].attributes) {
                        this.dealwebsocketData('A',0,data.contents[0].attributes)
                    }
                    if('B' in data.contents[0].attributes) {
                        this.dealwebsocketData('B',1,data.contents[0].attributes)
                    }
                    if('C' in data.contents[0].attributes) {
                        this.dealwebsocketData('C',2,data.contents[0].attributes)
                    }
                    if('D' in data.contents[0].attributes) {
                        this.dealwebsocketData('D',3,data.contents[0].attributes)
                    }
				},
				{ 'auto-delete': true }
			);
			this.stomp_link.subscribe(
				`/exchange/web-socket/tenant.user.${this.user_id}.#`,
				(res) => {
					let data = JSON.parse(res.body);
					// 0等待 1成功 2断开 3超时 4拒绝
					switch (data.replyType) {
						case 0:
							this.$message('等待连接');
							break;
						case 1:
							this.$message.success('连接成功');
							break;
						case 2:
							this.$message.error('断开连接');
							break;
						case 3:
							this.$message('连接超时');
							break;
						case 4:
							this.$message.error('连接被拒');
							break;
					}
				},
				{ 'auto-delete': true }
			);
		},
		// stomp连接失败的回调
		on_error(error) {
			// this.$message.error(error.headers.message);
            setTimeout(() => {
				this.link_websocket();
			}, 1000);
		},

        //渲染数据样式等处理
        getBatteryColor(num){
            if(num >=0 && num <= 25){
                return 'RGB(212,0,0)'
            }else if(num > 25 && num <=50){
                return 'RGB(170,67,0)'
            } else if(num > 50 && num <=75){
                return 'RGB(255,204,0)'
            } else{
                return 'RGB(0,169,0)'
            }
        },
        getBatteryarray(num){
            var intervalSize = 100 / 4
            var interval = Math.round(num / intervalSize)
            let arr = [];
            
            for(let i = 0; i < interval; i++) {
               arr.push(i)
            }
            
            return arr
        },
        getRFarray(num){
            var interval
            if(num === 0) {
                interval = 0
            } else if(num > 0 && num < 1471) {
                interval = 4
            } else if(num >= 1471 && num < 2228) {
                interval = 8
            } else if(num >= 2228 && num < 2504){
                interval = 12
            } else if(num >= 2504 && num < 2672){
                interval = 16
            } else if(num >= 2672 && num < 2920){
                interval = 20
            } else {
                interval = 24
            }
            let arr = [];
                for(let i = 0; i < interval; i++) {
                   arr.push(i)
                }
            
            return arr
        },
        getAFarray(num){
            var interval
            if(num >= 0 && num < 128) {
                interval = 0
            } else if(num >= 128 && num < 162) {
                interval = 4
            } else if(num >= 162 && num < 180){
                interval = 8
            } else if(num >= 180 && num < 1611){
                interval = 12
            } else if(num >= 1611 && num < 1884){
                interval = 16
            } else if(num >= 1884 && num < 2157){
                interval = 20
            } else {
                interval = 24
            }
            let arr = [];
                for(let i = 0; i < interval; i++) {
                   arr.push(i)
                }
            
            return arr
        },
        getSQarray(num) {
            var intervalSize = 25 / 5
            var interval = Math.floor(num / intervalSize)
            let arr = [];
            for(let i = 0; i < interval; i++) {
               arr.push(i)
            }
            return arr
        },

        //操作设备属性
        //设备锁定和解锁
        setLock(){
            if(this.deviceData.Status === 1) {
                let attributes = {};
                if(this.deviceData.Lock === 'OFF') {
                    attributes.Lock = 'ON'
                } else {
                    attributes.Lock = 'OFF';
                }
                this.request('put', `${sendCmdtoDevice}/8`, this.token, { contentType: 0, contents: [{ deviceId: this.id, attributes: attributes }] }, (res) => {
                    if (res.data.head.code != 200) {
                        return;
                    }
                });
            } else {
                this.$message.error('该设备离线，无法操作!');
            }
        },
    
        //设备静音操作
        setMute(el){
            if(this.deviceData.Lock === 'ON' || this.deviceData.Status === 2 ){
                this.$message.error('该设备已锁定或离线，无法设置')
            } else if(!el.IsMicroPhoneConnect){
                this.$message.error('该设备未连接话筒，设备保持静音状态')
            } else {
                let attributes = {}
                let data = {
                    Mute:0,
                    Chan:el.Chan
                }
                if(el.IsMute) {
                    data.Mute = 0
                } else {
                    data.Mute = 1
                }
                this.$set(attributes,el.Chan,data)
                this.request('put', `${sendCmdtoDevice}/8`, this.token, { contentType: 0, contents: [{ deviceId: this.id, attributes: attributes }] }, (res) => {
                    if (res.data.head.code != 200) {
                        return;
                    }
                });
            }
        },


        setChannel(el){
            if(this.deviceData.Lock === 'OFF' && this.deviceData.Status === 1) {
                this.dialogVisible = true;
                this.dialogData = JSON.parse(JSON.stringify(el));
                this.dialogData.Group = this.dialogData.Group === 9 ? 'U' : this.dialogData.Group;
                this.groupValue = this.dialogData.Group;
                this.chValue = el.CH;
                this.deviceChannelNum = this.deviceData.channel.length;
                this.setChan = el.Chan;
                this.setDeviceFreq = this.deviceData.FreqCode;
                this.dialogData.Freq = (this.dialogData.Freq/1000).toFixed(3)
                this.disabledVol = this.dialogData.Vol;
                this.disabledSQ = this.dialogData.SQ;
            } else {
                this.$message.error('该设备已锁定或离线，无法操作!');
            }
        },

        quitDialog(){
            this.dialogVisible = false;
        },

        //设置天线
        changeANT(){
            let attributes = {};
            let obj = {
                ANT:this.dialogData.ANT,
                Chan:this.setChan
            }
            this.$set(attributes,this.setChan,obj)
            this.request('put', `${sendCmdtoDevice}/8`, this.token, { contentType: 0, contents: [{ deviceId: this.id, attributes: attributes }] }, (res) => {
                if (res.data.head.code != 200) {
                    return;
                }
            });
        },

        //设置群组
        setGroup(value){
            let _self = this;
            let _num = value
            if(value === 'U') {
                let attributes = {}
                let obj = {
                    Freq:this.dialogData.Freq*1000,
                    Chan:this.setChan,
                }
                this.$set(attributes,this.setChan,obj)
                this.request('put', `${sendCmdtoDevice}/8`, this.token, { contentType: 0, contents: [{ deviceId: this.id, attributes: attributes }] }, (res) => {
                    if (res.data.head.code != 200) {
                        return;
                    }
                });
            } else {
                let attributes = {}
                let data = {
                    Group:_num,
                    CH:this.chValue,
                    Chan:this.setChan
                }
                if(this.deviceChannelNum === 2){
                    if(data.Chan === 'A') {
                        if(this.dialogData.Group > 4 && data.Group <= 4){
                            if(this.dialogData.CH > 8) {
                                data.CH = 8
                            }
                        } else if(this.dialogData.Group === 'U' && data.Group <= 4) {
                            if(this.dialogData.CH > 8) {
                                data.CH = 8
                            } else {
                                data.CH = 1
                            }
                        } else if(this.dialogData.Group === 'U' && data.Group > 4) {
                            data.CH = 1
                        }
                    } else {
                        if(this.dialogData.Group > 4 && data.Group <= 4){
                            if(this.dialogData.CH > 16) {
                                data.CH = 16
                            }
                        } else if(this.dialogData.Group <= 4 && data.Group > 4) {
                            if(this.dialogData.CH < 13) {
                                data.CH = 13
                            }
                        } else if(this.dialogData.Group === 'U' && data.Group <= 4) {
                            if(this.dialogData.CH > 16) {
                                data.CH = 16
                            } else {
                                data.CH = 9
                            }
                        } else if(this.dialogData.Group === 'U' && data.Group > 4) {
                            data.CH = 13
                        }
                    }
                } else if(this.deviceChannelNum === 4) {
                    if(data.Chan === 'A' || data.Chan === 'B') {
                        if(this.dialogData.Group > 4 && data.Group <= 4){
                            if(this.dialogData.CH > 8) {
                                data.CH = 8
                            }
                        } else if(this.dialogData.Group === 'U' && data.Group <= 4) {
                            if(this.dialogData.CH > 8) {
                                data.CH = 8
                            } else {
                                data.CH = 1
                            }
                        } else if(this.dialogData.Group === 'U' && data.Group > 4) {
                            data.CH = 1
                        }
                    } else {
                        if(this.dialogData.Group > 4 && data.Group <= 4){
                            if(this.dialogData.CH > 16) {
                                data.CH = 16
                            }
                        } else if(this.dialogData.Group <= 4 && data.Group >= 4) {
                            if(this.dialogData.CH < 13) {
                                data.CH = 13
                            }
                        } else if(this.dialogData.Group === 'U' && data.Group <= 4) {
                            if(this.dialogData.CH > 16) {
                                data.CH = 16
                            } else {
                                data.CH = 9
                            }
                        } else if(this.dialogData.Group === 'U' && data.Group > 4) {
                            data.CH = 13
                        }
                    }
                }
                let channelIndex = this.deviceData.channel.findIndex((_el) => {return _el.Chan === this.setChan})
                let otherChannel = []
                let otherGroupCH = []
                let currentData = {
                    Group:_num,
                    CH:this.chValue
                }
                for (let i = 0; i < this.deviceData.channel.length; i++) {
                    if(i !== channelIndex) {
                        otherChannel.push(this.deviceData.channel[i].Freq)
                        let obj = {
                            Group:this.deviceData.channel[i].Group,
                            CH:this.deviceData.channel[i].CH
                        }
                        otherGroupCH.push(obj)
                    }
                }
                let _index = otherGroupCH.findIndex((el) => {return el.Group === currentData.Group && el.CH === currentData.CH})
                let conflictChannel = []
                if(this.setDeviceFreq === '640-690') {
                    conflictChannel = otherChannel.filter((item) => Math.abs(this.freqArray1[data.Group - 1][data.CH - 1] - item) < 250)
                } else if(this.setDeviceFreq === '530-580') {
                    conflictChannel = otherChannel.filter((item) => Math.abs(this.freqArray2[data.Group - 1][data.CH - 1] - item) < 250)
                }
                if(conflictChannel.length && _index < 0) {
                    _self.$message.error('该通道频率需与该设备其他通道频率差值大于等于0.250MHz')
                } else if(_index > -1){
                    _self.$message.error('当前设置的群组和信道已被占用！')
                } else {
                    this.$set(attributes,this.setChan,data)
                    this.request('put', `${sendCmdtoDevice}/8`, this.token, { contentType: 0, contents: [{ deviceId: this.id, attributes: attributes }] }, (res) => {
                        if (res.data.head.code != 200) {
                            return;
                        }
                    });
                }
            }
        },

        //设置信道
        setCH(value){
            let _self = this;
            let _num = value;
            let attributes = {}
            let data = {
                Group:this.groupValue,
                CH:_num,
                Chan:this.setChan
            }
            let channelIndex = this.deviceData.channel.findIndex((_el) => {return _el.Chan === this.setChan})
            let otherChannel = []
            let otherGroupCH = []
            let currentData = {
                Group:this.groupValue,
                CH:_num
            }
            for (let i = 0; i < this.deviceData.channel.length; i++) {
                if(i !== channelIndex) {
                    otherChannel.push(this.deviceData.channel[i].Freq)
                    let obj = {
                        Group:this.deviceData.channel[i].Group,
                        CH:this.deviceData.channel[i].CH
                    }
                    otherGroupCH.push(obj)
                }
            }
            let _index = otherGroupCH.findIndex((el) => {return el.Group === currentData.Group && el.CH === currentData.CH})
            let conflictChannel = []
            if(this.setDeviceFreq === '640-690') {
                conflictChannel = otherChannel.filter((item) => Math.abs(this.freqArray1[data.Group - 1][data.CH - 1] - item) < 250)
            } else if(this.setDeviceFreq === '530-580') {
                conflictChannel = otherChannel.filter((item) => Math.abs(this.freqArray2[data.Group - 1][data.CH - 1] - item) < 250)
            }

            if(conflictChannel.length && _index < 0) {
                _self.$message.error('该通道频率需与该设备其他通道频率差值大于等于0.250MHz')
            } else if(_index > -1){
                _self.$message.error('当前设置的群组和信道已被占用！')
            } else {
                this.$set(attributes,this.setChan,data)
                this.request('put', `${sendCmdtoDevice}/8`, this.token, { contentType: 0, contents: [{ deviceId: this.id, attributes: attributes }] }, (res) => {
                    if (res.data.head.code != 200) {
                        return;
                    }
                });
            }
        },

        //设置SQ
        setSQ(command,number){
            if(!this.timerNum && command === 'subSQ') return
            if(!this.timerNum && command === 'addSQ') return
            let nValue = number
            if(command === 'subSQ'){
                if(this.dialogData.SQ === 0) {
                    return
                } else {
                    nValue -= 5
                }
            } else {
                if(this.dialogData.SQ === 25) {
                    return
                } else {
                    nValue += 5
                }
            }

            let sq = 0;
            if(nValue === 25) {
                sq = 0
            } else if(nValue === 20) {
                sq = 1
            } else if(nValue === 15){
                sq = 2
            } else if(nValue === 10) {
                sq = 3
            } else if(nValue === 5) {
                sq = 4
            } else {
                sq = 5
            }
            let attributes = {}
            let data = {
                SQ:sq,
                Chan:this.setChan
            }
            this.$set(attributes,this.setChan,data)
            this.request('put', `${sendCmdtoDevice}/8`, this.token, { contentType: 0, contents: [{ deviceId: this.id, attributes: attributes }] }, (res) => {
                if (res.data.head.code != 200) {
                    return;
                }
			});
        },
        longSetSQ(command){
            clearInterval(this.timer);
            this.starttime = new Date().getTime()
            let _self = this;
            if(command === 'subSQ'){
                this.timer = setInterval(function(){
                    if(_self.dialogData.SQ < 5){
                        _self.dialogData.SQ = 0
                    } else {
                        _self.dialogData.SQ -= 5
                    }
                },250)
            } else {
                this.timer = setInterval(function(){
                    if(_self.dialogData.SQ > 20){
                        _self.dialogData.SQ = 25
                    } else {
                        _self.dialogData.SQ += 5
                    }
                },250)
            }
        },
        overSetSQ(){
            clearInterval(this.timer);
            this.timer = null;
            this.endtime = new Date().getTime()
            if((this.endtime - this.starttime) < 250) {
                this.timerNum = true
            } else {
                this.timerNum = false
                let attributes = {}
                let sq = 0;
                if(this.dialogData.SQ === 25) {
                    sq = 0
                } else if(this.dialogData.SQ === 20) {
                    sq = 1
                } else if(this.dialogData.SQ === 15){
                    sq = 2
                } else if(this.dialogData.SQ === 10) {
                    sq = 3
                } else if(this.dialogData.SQ === 5) {
                    sq = 4
                } else {
                    sq = 5
                }
                let data = {
                    SQ:sq,
                    Chan:this.setChan
                }
                this.$set(attributes,this.setChan,data)
                this.request('put', `${sendCmdtoDevice}/8`, this.token, { contentType: 0, contents: [{ deviceId: this.id, attributes: attributes }] }, (res) => {
                    if (res.data.head.code != 200) {
                        return;
                    }
			    });
            }
        },

        //设置音量
        setVol(command,number){
            if(!this.timerNum && command === 'subVol') return
            if(!this.timerNum && command === 'addVol') return
            let _self = this;
            let nValue = number;
            if(command === 'subVol') {
                if (number === undefined) {
                    nValue = 0
                } else {
                    nValue -= 1

                }
            } else if(command === 'addVol') {
                if (number === undefined) {
                    nValue = 0
                }else{
                    nValue += 1
                }
            } else if(command === 'changeVol') {
                if (number === undefined) {
                  nValue = 0
                }
                nValue = parseInt(nValue)
            }  
            let attributes = {}
            let data = {
                Vol:nValue,
                Chan:this.setChan
            }
            if(data.Vol > 31 || data.Vol < 0) {
                this.$message({
                    message:'音量范围为0-31',
                    type:'error'
                })
            } else {
                this.$set(attributes,this.setChan,data)
                this.request('put', `${sendCmdtoDevice}/8`, this.token, { contentType: 0, contents: [{ deviceId: this.id, attributes: attributes }] }, (res) => {
                    if (res.data.head.code != 200) {
                        return;
                    }
                });
            }
        },
        longSetVol(command){
            clearInterval(this.timer);
            this.starttime = new Date().getTime()
            let _self = this;
            if(command === 'subVol'){
                this.timer = setInterval(function(){
                    if(_self.dialogData.Vol < 2){
                        _self.dialogData.Vol = 0
                    } else {
                        _self.dialogData.Vol -= 1
                    }
                },250)
            } else {
                this.timer = setInterval(function(){
                    if(_self.dialogData.Vol > 30){
                        _self.dialogData.Vol = 31
                    } else {
                        _self.dialogData.Vol += 1
                    }
                },250)
            }
        },
        overSetVol(){
            clearInterval(this.timer);
            this.timer = null;
            let _self = this;
            this.endtime = new Date().getTime()
            if((this.endtime - this.starttime) < 250) {
                this.timerNum = true
            } else {
                this.timerNum = false
                let attributes = {}
                let data = {
                    Vol:this.dialogData.Vol,
                    Chan:this.setChan
                }
                this.$set(attributes,this.setChan,data)
                this.request('put', `${sendCmdtoDevice}/8`, this.token, { contentType: 0, contents: [{ deviceId: this.id, attributes: attributes }] }, (res) => {
                    if (res.data.head.code != 200) {
                        return;
                    }
                });
            }
        },

        //设置U组频率
        setFreq(command,number){
            let _self = this;
            let nValue = number;
            if(command === 'subFreq') {
                if(number === undefined){
                    if((this.deviceChannelNum === 2 && this.setChan === 'A' && this.setDeviceFreq === '640-690') || (this.deviceChannelNum === 4 && (this.setChan === 'A' || this.setChan === 'B') && this.setDeviceFreq === '640-690'))  {
                        nValue = 640.000
                    } else if((this.deviceChannelNum === 2 && this.setChan === 'B' && this.setDeviceFreq === '640-690') || (this.deviceChannelNum === 4 && (this.setChan === 'C' || this.setChan === 'D') && this.setDeviceFreq === '640-690')) {
                        nValue = 665.000
                    } else if((this.deviceChannelNum === 2 && this.setChan === 'A' && this.setDeviceFreq === '530-580') || (this.deviceChannelNum === 4 && (this.setChan === 'A' || this.setChan === 'B') && this.setDeviceFreq === '530-580')){
                        nValue = 530.000
                    } else if((this.deviceChannelNum === 2 && this.setChan === 'B' && this.setDeviceFreq === '530-580') || (this.deviceChannelNum === 4 && (this.setChan === 'C' || this.setChan === 'D') && this.setDeviceFreq === '530-580')){
                        nValue = 555.000
                    }
                } else {
                    nValue -= 0.250
                }
            } else if(command === 'addFreq') {
                if(number === undefined) {
                    if((this.deviceChannelNum === 2 && this.setChan === 'A' && this.setDeviceFreq === '640-690') || (this.deviceChannelNum === 4 && (this.setChan === 'A' || this.setChan === 'B') && this.setDeviceFreq === '640-690'))  {
                        nValue = 640.000
                    } else if((this.deviceChannelNum === 2 && this.setChan === 'B' && this.setDeviceFreq === '640-690') || (this.deviceChannelNum === 4 && (this.setChan === 'C' || this.setChan === 'D') && this.setDeviceFreq === '640-690')) {
                        nValue = 665.000
                    } else if((this.deviceChannelNum === 2 && this.setChan === 'A' && this.setDeviceFreq === '530-580') || (this.deviceChannelNum === 4 && (this.setChan === 'A' || this.setChan === 'B') && this.setDeviceFreq === '530-580')){
                        nValue = 530.000
                    } else if((this.deviceChannelNum === 2 && this.setChan === 'B' && this.setDeviceFreq === '530-580') || (this.deviceChannelNum === 4 && (this.setChan === 'C' || this.setChan === 'D') && this.setDeviceFreq === '530-580')){
                        nValue = 555.000
                    }
                } else {
                    nValue += 0.250
                }
            } else {
                if(number == undefined) {
                    this.$message.error('频率不能为空！')
                    return
                }
            }
            if(this.deviceChannelNum === 2 && this.setChan === 'A' && (nValue < 640.000 || nValue > 664.975) && this.setDeviceFreq === '640-690') {
                _self.$message.error('该通道频率范围为640.000MHz - 664.975MHz！')
            } else if (this.deviceChannelNum === 2 && this.setChan === 'A' && (nValue < 530.000 || nValue > 554.975) && this.setDeviceFreq === '530-580') {
                _self.$message.error('该通道频率范围为530.000MHz - 554.975MHz！')
            } else if(this.deviceChannelNum === 2 && this.setChan === 'B' && (nValue < 665.000 || nValue > 689.975) && this.setDeviceFreq === '640-690') {
                _self.$message.error('该通道频率范围为665.000MHz - 689.975MHz！')
            } else if(this.deviceChannelNum === 2 && this.setChan === 'B' && (nValue < 555.000 || nValue > 579.975) && this.setDeviceFreq === '530-580') {
                _self.$message.error('该通道频率范围为555.000MHz - 579.975MHz！')
            } else if(this.deviceChannelNum === 4 && (this.setChan === 'A' || this.setChan === 'B') && (nValue < 640.000 || nValue > 664.975) && this.setDeviceFreq === '640-690') {
                _self.$message.error('该通道频率范围为640.000MHz - 664.975MHz！')
            } else if(this.deviceChannelNum === 4 && (this.setChan === 'A' || this.setChan === 'B') && (nValue < 530.000 || nValue > 554.975) && this.setDeviceFreq === '530-580') {
                _self.$message.error('该通道频率范围为530.000MHz - 554.975MHz！')
            } else if(this.deviceChannelNum === 4 && (this.setChan === 'C' || this.setChan === 'D') && (nValue < 665.000 || nValue > 689.975) && this.setDeviceFreq === '640-690') {
                _self.$message.error('该通道频率范围为665.000MHz - 689.975MHz！')
            } else if(this.deviceChannelNum === 4 && (this.setChan === 'C' || this.setChan === 'D') && (nValue < 555.000 || nValue > 579.975) && this.setDeviceFreq === '530-580') {
                _self.$message.error('该通道频率范围为555.000MHz - 579.975MHz！')
            } else {
                let attributes = {}
                let data = {
                    Freq:nValue*1000,
                    Chan:this.setChan,
                }
                let channelIndex = this.deviceData.channel.findIndex((_el) => {return _el.Chan === this.setChan})
                let otherChannel = []
                for (let i = 0; i < this.deviceData.channel.length; i++) {
                    if(i !== channelIndex) {
                        otherChannel.push(this.deviceData.channel[i].Freq)
                    }
                }
                let conflictChannel = otherChannel.filter((item) => Math.abs(data.Freq - item) < 250)
                if(conflictChannel.length) {
                    _self.$message.error('自定义群组频率需与该设备其他通道频率差值大于等于0.250MHz')
                } else {
                    this.$set(attributes,this.setChan,data)
                    this.request('put', `${sendCmdtoDevice}/8`, this.token, { contentType: 0, contents: [{ deviceId: this.id, attributes: attributes }] }, (res) => {
                        if (res.data.head.code != 200) {
                            return;
                        } 
                    });
                }
            }
        },

    }
})