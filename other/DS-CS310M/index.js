let url = `${我是接口地址}/`;
// let url = 'http://iot.china-hushan.com/';
let getChannelDetail = url + 'api-device/device/status'; //查询历史记录
let sendCmdtoDevice = url + 'api-device/device/operation'; // 下发指令
let user_info_url = `${url}api-auth/oauth/userinfo`; //获取用户信息

new Vue({
    el: '#digitupper',
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
        deviceData:{},
        modeData:[
            {
                value:0,
                lable:'自由模式'
            },{
                value:1,
                lable:'轮替模式'
            },{
                value:2,
                lable:'限制模式'
            },{
                value:3,
                lable:'申请模式'
            },
        ],
        priorUnit:[],
        guestUnit:[],
        guestUnitNum:6,
    },

    created(){
        
        // this.ws_name = 'webApp';
		// this.ws_password = 'webApp';
		// this.user_id = '1645636792924983298';
        // this.get_device_status()
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
    mounted(){
        this.modeValue = this.deviceData.mode
    },

    methods:{
         // 获取用户信息包括 id 连接stomp用户名和密码
		get_user_info() {
			this.request('get', user_info_url, this.token, (res) => {
				if (res.data.head.code != 200) {
					this.$message.error('无法获取用户信息');
					return;
				}
				this.ws_name = res.data.data.mqUser;
				this.ws_password = res.data.data.mqPassword;
				this.user_id = res.data.data.id;
				this.link_websocket();
			});
		},


        //处理获取的设备数据
        dealDeviceData(data){
            let obj = {}
            this.$set(obj,'Status',data.status)
            this.$set(obj,'IP',data.properties.ip.propertyValue)
            // this.$set(obj,'prior',data.properties.meetingmode.propertyValue.prior.propertyValue === 1 ? true:false)
            // this.$set(obj,'mode',data.properties.meetingmode.propertyValue.mode.propertyValue)
            // this.$set(obj,'speakernum',data.properties.meetingmode.propertyValue.speakernum.propertyValue)
            this.$set(obj,'prior',data.properties.test.propertyValue.prior.propertyValue === 1 ? true:false)
            this.$set(obj,'mode',data.properties.test.propertyValue.mode.propertyValue)
            this.$set(obj,'speakernum',data.properties.test.propertyValue.speakernum.propertyValue)
            this.$set(obj,'isPriorState',data.properties.test.propertyValue.c_only_stat.propertyValue)
            this.$set(obj,'units', this.getUnitList(data.properties.unit_list.propertyValue))
            return obj
        },

        //处理unit列表获取单元
        getUnitList(arr){
            let unitData = []
            let num = arr[0] + arr[arr[0]+1] + 2
            let unitArray = arr.slice(1,arr[0]+1).concat(arr.slice(arr[0]+2,num))
            this.priorUnit = arr.slice(1,arr[0]+1)
            this.guestUnit = arr.slice(arr[0]+2,num)
            this.guestUnitNum = this.guestUnit.length
            let unitStatus = arr.slice(num+1, num + arr[num] + 1).concat(arr.slice(num + arr[num] + 2,num + arr[num] + 2 + arr[num+arr[num]+1]))
            for(let i = 0; i < unitArray.length; i++) {
                let obj = {
                    id:unitArray[i],
                    status:0
                }
                for(let j = 0; j < unitStatus.length; j++){
                    if(unitArray[i] === unitStatus[j]) {
                        obj.status = 1
                    }
                }
                unitData.push(obj)
            }
            return unitData
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

        //获取已开启单元数量
        getOpenUnit(data) {
            let arr = data.filter(item => item.status)
            return arr.length
        },

        //设置主席专有模式
        setPrior(){
            let value = this.deviceData.prior === true ? 1 : 0
            let attributes = {
                test:{
                    prior: value
                }
            }
            this.request('put', `${sendCmdtoDevice}/8`, this.token, { contentType: 0, contents: [{ deviceId: this.id, attributes: attributes }] }, (res) => {
                if (res.data.head.code != 200) {
                    return;
                }
            });
        },

        //设置会议模式
        changeMeetingmode(){
            let attributes = {
                test:{
                    mode: this.deviceData.mode,
                    speakernum: this.deviceData.speakernum
                }
            }
            this.request('put', `${sendCmdtoDevice}/8`, this.token, { contentType: 0, contents: [{ deviceId: this.id, attributes: attributes }] }, (res) => {
                if (res.data.head.code != 200) {
                    return;
                }
            });
        },

        //设置讲话数量
        setSpeakerNum(command,number){
            let nValue = number;
            if(command === 'subNum') {
                if (number === undefined) {
                    nValue = 1
                } else {
                    nValue -= 1

                }
            } else if(command === 'addNum') {
                if (number === undefined) {
                    nValue = 1
                }else{
                    nValue += 1
                }
            } else if(command === 'changeNum') {
                if (number === undefined) {
                  nValue = 1
                }
                nValue = parseInt(nValue)
            }  
            let attributes = {
                test:{
                    speakernum: nValue
                }
            }
            this.request('put', `${sendCmdtoDevice}/8`, this.token, { contentType: 0, contents: [{ deviceId: this.id, attributes: attributes }] }, (res) => {
                if (res.data.head.code != 200) {
                    return;
                }
            });
        },

        //打开关闭单元麦克风
        openCloseUnit(item){
            if(this.deviceData.Status !== 1){
                this.$message.warning('当前设备离线，无法操作！')
                return
            }
            let value = null
            if(item.status === 1){
                value = 0
            } else {
                if(this.deviceData.isPriorState) {
                    let _index = this.priorUnit.indexOf(item.id)
                    if(_index > -1) {
                        value = 1
                    } else {
                        this.$message.warning('当前为主席优先状态，客席无权限!')
                    }
                } else {
                    if(this.deviceData.mode === 0 || this.deviceData.mode === 1) {
                        value = 1
                    } else if(this.deviceData.mode === 3){
                        let _index = this.priorUnit.indexOf(item.id)
                        if(_index > -1) {
                            value = 1
                        } else {
                            value = 1
                            this.$message.warning('需等待主席批准！')
                        }
                    } else {
                        let _index = this.priorUnit.indexOf(item.id)
                        if(_index > -1) {
                            value = 1
                        } else {
                            let arr = this.deviceData.units.filter((el) => el.status && this.guestUnit.indexOf(el.id) > -1)
                            if(arr.length === this.deviceData.speakernum) {
                                this.$message.warning('开启单元不能超过限制数量')
                                return
                            } else {
                                value = 1
                            }
                        }
                    }
                }
            }
            let arr = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
            arr[item.id] = value
            let attributes = {
                test:{
                    id:item.id,
                    opt_list:arr
                }
            }
            this.request('put', `${sendCmdtoDevice}/8`, this.token, { contentType: 0, contents: [{ deviceId: this.id, attributes: attributes }] }, (res) => {
                if (res.data.head.code != 200) {
                    return;
                }
            });
        },

         //websocket连接
         link_websocket() {
            //this.ws_link = new WebSocket('ws://iot.china-hushan.com:15674/ws');
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
                    console.log(data.contents[0].attributes)
                    if('test' in data.contents[0].attributes) {
                        if('mode' in data.contents[0].attributes.test) {
                            this.deviceData.mode = data.contents[0].attributes.test.mode
                        }
                        if('speakernum' in data.contents[0].attributes.test) {
                            this.deviceData.speakernum = data.contents[0].attributes.test.speakernum
                        }
                        if('prior' in data.contents[0].attributes.test) {
                            this.deviceData.prior = data.contents[0].attributes.test.prior === 1 ? true : false
                        }
                        if('c_only_stat' in data.contents[0].attributes.test) {
                            this.deviceData.isPriorState = data.contents[0].attributes.test.c_only_stat
                        }
                    } else {
                        if( 'unit_list' in data.contents[0].attributes) {
                            this.deviceData.units = this.getUnitList(data.contents[0].attributes.unit_list)
                        }
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
    }
        
})