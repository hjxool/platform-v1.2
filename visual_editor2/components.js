// 通用方法及变量
const fn = {
	props: ['obj', 'radio', 'token', 'inject_data'],
	methods: {
		send_order(value) {
			if (typeof value !== 'undefined' && !this.path_list.length) {
				// 值不为空 且 未绑定属性
				return;
			}
			// 因为可以有多个绑定的属性和服务 所以异步下发指令
			for (let val of this.obj.behaviorList) {
				let body = {
					contentType: 0,
					deviceId: val.deviceId,
				};
				// 有服务则下发
				if (val.serviceIdentifier) {
					body.contentType = 2;
					body.service = val.serviceIdentifier;
				}
				if (val.attrPath && (typeof value != 'undefined' || val.customJson)) {
					// 下发属性 且 value有值 或 自定义指令有内容
					body.attributeMap = {};
					if (typeof value != 'undefined') {
						body.attributeMap[val.attrPath] = value;
					}
					if (val.customJson.json) {
						let t = JSON.parse(val.customJson.json);
						body.attributeMap = { ...body.attributeMap, ...t.attributes };
					}
				}
				// 有topic才能下发指令
				if (val.topicId) {
					return this.request('put', `${sendCmdtoDevice}/${val.topicId}`, this.token, body);
				}
			}
		},
		// 设置组件样式
		style(obj_data) {
			return {
				position: 'absolute',
				width: obj_data.w * this.radio + 'px',
				height: obj_data.h * this.radio + 'px',
				top: obj_data.y * this.radio + 'px',
				left: obj_data.x * this.radio + 'px',
				zIndex: obj_data.z_index,
				transform: `rotate(${obj_data.angle}deg)`,
			};
		},
		// 根绝组件路径解析数值
		analysis_path(path, path_index, source) {
			for (let key in source) {
				if (Object.prototype.hasOwnProperty.call(source, key)) {
					if (path[path_index] == key) {
						// 是自身属性才取值遍历
						let value;
						// 有两种形式的数据
						// 一种是{ key: { propertyValue: value }, key2:[{xx:{propertyValue:value}}]}
						// 另一种是{key:value}
						if (Array.isArray(source)) {
							value = source[key];
						} else {
							if (source[key]?.propertyValue === undefined) {
								value = source[key];
							} else {
								value = source[key]?.propertyValue;
							}
						}
						if (path_index == path.length - 1) {
							// 如果是path最后一层则取值
							switch (this.obj.type) {
								case 'slider':
								case 'sliderV':
								case 'progressV':
									if (this.data_type !== 'int' && this.data_type !== 'float' && this.data_type !== 'double' && this.data_type !== 'any') {
										return;
									}
									// data_type为any时能转数字转数字
									if (isNaN(Number(value))) {
										return;
									}
									// 滑块上报数据根据组件设置的步长限制精度
									let v = Number(value);
									if (this.obj.type === 'progressV') {
										this.accuracy = 2;
									}
									let m = Math.pow(10, this.accuracy);
									this.value = Math.round(v * m) / m;
									break;
								case 'switch1':
								case 'switch1V':
								case 'switch2':
								case 'text-block':
								case 'switchButton':
									// 所有值转化成字符串匹配
									this.value = value + '';
									break;
								case 'input':
									// 除了对象都能接收
									if (typeof value === 'object') {
										return;
									}
									this.value = value;
									break;
								default:
									return value;
							}
						} else {
							// 否则继续递归
							return this.analysis_path(path, ++path_index, value);
						}
					}
				}
			}
		},
		// 将字符串路径解析成数组
		init_path(path) {
			// 以点分隔取层级 再看是否是数组下标的形式 再分隔层级
			let list = path.split('.');
			for (let index in list) {
				let val = list[index];
				if (val.indexOf('[') != -1) {
					// 带数组下标的要 从当前位置删除当前元素 替换为两个新的元素
					let t = val.split('[');
					let list2 = [];
					for (let val2 of t) {
						let t2 = val2.replace(']', '');
						list2.push(t2);
					}
					list.splice(Number(index), 1, ...list2);
				}
			}
			return list;
		},
	},
	computed: {
		path_list() {
			let list = [];
			if (this.obj.behaviorList) {
				if (this.obj.behaviorList?.length) {
					for (let val of this.obj.behaviorList) {
						if (val.attrPath) {
							let t = {
								path_str: val.attrPath,
								path: this.init_path(val.attrPath), //解析后的数组路径用于匹配回显
								type: val.attrType,
							};
							list.push(t);
						}
					}
				}
			} else {
				// 兼容老数据
				if (this.obj.attr?.length) {
					// 有多个路径就有多个类型
					for (let val of this.obj.attr) {
						let t = {
							path_str: val.path,
							path: this.init_path(val.path), //解析后的数组路径用于匹配回显
							type: val.type,
						};
						list.push(t);
					}
				}
			}
			return list;
		},
		data_type() {
			return this.path_list[0]?.type || 'all';
		},
	},
	watch: {
		inject_data(newvalue) {
			// 不同组件判断条件不同
			if (this.obj.type === '连线') {
				// 连线两端任意端是设备节点就 显示状态 或 更新连线信息
				if ((this.obj.bindDeviceId?.targetDevice || this.obj.bindDeviceId?.sourceDevice) && typeof newvalue.device_status === 'boolean') {
					// 判断当前设备上报消息 与当前连线组件是否相关 且 携带设备在线状态字段
					// 断连条件 有一个设备离线就断开 在线条件 两个设备都在线
					switch (newvalue.device_id) {
						case this.obj.bindDeviceId.targetDevice:
							// 相关则判断设备在线状态
							this.target_status = newvalue.device_status;
							break;
						case this.obj.bindDeviceId.sourceDevice:
							this.source_status = newvalue.device_status;
							break;
						default:
							// 当接收的数据与当前线两端的设备id都不符 则不继续向下执行
							return;
					}
					// 更新完设备在线状态后 更新连线当前信息
					if (this.line_info) {
						// 不论另一端设备是否在线 只要当前设备上报了接口状态 就要存下来
						// 设备上报的属性不一定有接口字段
						if (newvalue?.data?.iot_link_channels) {
							// 存储更新单个接口状态
							for (let val of this.line_info) {
								let res;
								switch (newvalue.device_id) {
									case val.start.device_id:
										if (val.start.identifier) {
											res = this.analysis_path(['iot_link_channels', val.start.identifier], 0, newvalue.data);
											// 只更新上报的字段 比如有A B两个接口 但是A接口状态变化 就会只收到A接口字段
											if (res !== undefined) {
												val.start.status = res ? true : false;
											}
										}
										break;
									case val.end.device_id:
										if (val.end.identifier) {
											res = this.analysis_path(['iot_link_channels', val.end.identifier], 0, newvalue.data);
											if (res !== undefined) {
												val.end.status = res ? true : false;
											}
										}
										break;
								}
							}
							// 有上报接口
							// 两端设备都在线时 才需要具体分析接口状态 根据存储的两端接口状态 更新接口连线状态
							if (this.source_status && this.target_status) {
								for (let val of this.line_info) {
									val.status = val.start.status && val.end.status;
									switch (true) {
										case !val.start.status && val.end.status:
											val.msg = `${val.start.name}接口异常`;
											break;
										case val.start.status && !val.end.status:
											val.msg = `${val.end.name}接口异常`;
											break;
										case !val.start.status && !val.end.status:
											val.msg = `${val.start.name}接口 和 ${val.end.name}接口异常`;
											break;
										case val.start.status && val.end.status:
											val.msg = '连接正常';
											break;
									}
								}
							}
						}
						if (!this.source_status || !this.target_status) {
							// 设备离线 则将所有接口信息更改为xx设备离线
							switch (true) {
								case this.source_status && !this.target_status:
									for (let val of this.line_info) {
										val.msg = `${this.obj.bindDeviceId.targetDeviceName || ''}设备离线`;
										val.status = false;
									}
									break;
								case !this.source_status && this.target_status:
									for (let val of this.line_info) {
										val.msg = `${this.obj.bindDeviceId.sourceDeviceName || ''}设备离线`;
										val.status = false;
									}
									break;
								case !this.source_status && !this.target_status:
									for (let val of this.line_info) {
										val.msg = `${this.obj.bindDeviceId.sourceDeviceName || '起始'}设备 和 ${this.obj.bindDeviceId.targetDeviceName || '末端'}设备离线`;
										val.status = false;
									}
									break;
							}
						}
					}
				}
			} else if (this.obj.shapeNickname == '设备节点') {
				// 本质是多属性回显 以往组件是单属性回显
				if (this.obj.dataConfig.deviceId === newvalue.device_id) {
					// 设备状态
					if (typeof newvalue.device_status === 'boolean') {
						this.is_normal = newvalue.device_status;
					}
					// 只要设备id匹配 把原先的单属性解析改为遍历取出每个属性解析并并存到数组下而不是this.value
					for (let val of this.status) {
						// analysis_path原先没设计有多属性回显 因此用的全局变量 这里设置全局变量 用完后置空
						// this.data_type = val.type;
						let r = this.analysis_path(val.path, 0, newvalue.data);
						if (r !== undefined) {
							val.value = r;
						}
						// this.data_type = null;
					}
				}
			} else if (this.obj.type == '巡检按钮') {
				// 是推流消息 且 点过巡检
				if (newvalue.message && this.check_list) {
					this.$bus.$emit('online_check', { type: 'update', data: newvalue.message });
				}
			} else if (this.obj.type === 'audio_matrix') {
				if (this.obj.dataConfig.deviceId == newvalue.device_id && newvalue.data.MIXS) {
					let title = '音频矩阵';
					this.value = [];
					let temp = newvalue.data.MIXS.propertyValue || newvalue.data.MIXS;
					for (let i = 0; i < 9; i++) {
						let t = (temp[i * 2] >>> 0).toString(2).split('').reverse();
						let t2 = 12 - t.length;
						for (let k = 0; k < t2; k++) {
							t.push('0');
						}
						this.value.push(t);
					}
					this.$bus.$emit('matrix_popup', { type: 'update', title, data: this.value, device_id: this.obj.dataConfig.deviceId });
				}
			} else if (this.obj.type === 'video_matrix') {
				// 视频矩阵只绑定设备id 根据固定字段取值
				if (this.obj.dataConfig.deviceId == newvalue.device_id && newvalue.data.VSWT) {
					let title;
					switch (this.obj.dataConfig.productId) {
						case '1564171104871739392':
							// 一代
							if (newvalue.data.VSWT.length == 2) {
								this.value = newvalue.data.VSWT;
							} else if (newvalue.data.VSWT.propertyValue.length == 2) {
								this.value = newvalue.data.VSWT.propertyValue;
							}
							title = '视频矩阵一代';
							break;
						case '1722147067370217472':
							// 二代
							if (newvalue.data.VSWT.length == 4) {
								this.value = newvalue.data.VSWT;
							} else if (newvalue.data.VSWT.propertyValue.length == 4) {
								this.value = newvalue.data.VSWT.propertyValue;
							}
							title = '视频矩阵二代';
							break;
					}
					// 更新完值以后发送给父页面
					this.$bus.$emit('matrix_popup', { type: 'update', title, data: this.value, device_id: this.obj.dataConfig.deviceId });
				}
			} else if (this.obj.shapeNickname == '环境检测数据组件') {
				if (this.obj.dataConfig.deviceId == newvalue.device_id && newvalue.data.st) {
					let obj = newvalue.data;
					// 区分是propertyValue还是上报数据
					if (obj.st.propertyValue) {
						this.list[0].value = Math.round(Number(obj.st.propertyValue.mtemp.propertyValue));
						this.list[1].value = Math.round(Number(obj.st.propertyValue.mhumi.propertyValue));
						this.list[2].value = Math.round(Number(obj.st.propertyValue.mlux.propertyValue));
						this.list[3].value = Math.round(Number(obj.st.propertyValue.CO2.propertyValue));
						this.list[4].value = Math.round(Number(obj.st.propertyValue.voc.propertyValue));
						this.list[5].value = Math.round(Number(obj.st.propertyValue.formaldehyde.propertyValue));
					} else {
						for (let key in obj.st) {
							// 设备上报的不一定是需要读取的属性
							switch (key) {
								case 'mtemp':
									this.list[0].value = Math.round(Number(obj.st.mtemp));
									break;
								case 'mhumi':
									this.list[1].value = Math.round(Number(obj.st.mhumi));
									break;
								case 'mlux':
									this.list[2].value = Math.round(Number(obj.st.mlux));
									break;
								case 'CO2':
									this.list[3].value = Math.round(Number(obj.st.CO2));
									break;
								case 'voc':
									this.list[4].value = Math.round(Number(obj.st.voc));
									break;
								case 'formaldehyde':
									this.list[5].value = Math.round(Number(obj.st.formaldehyde));
									break;
							}
						}
					}
				}
			} else if (this.obj.shapeNickname == '窗帘组件') {
				if (this.obj.dataConfig.deviceId == newvalue.device_id) {
					let obj = newvalue.data;
					switch (this.obj.dataConfig.productType) {
						case '1792397648367259648':
							if (!obj.st) {
								return;
							}
							if (obj.st.propertyValue) {
								this.select = obj.st.propertyValue.valhex.propertyValue;
							} else {
								this.select = obj.st.valhex;
							}
							break;
						case '1722147067370217472':
							if (!obj.CCCMD) {
								return;
							}
							if (obj.CCCMD.propertyValue) {
								this.select = obj.CCCMD.propertyValue.Cmd.propertyValue;
							} else {
								this.select = obj.CCCMD.Cmd;
							}
							break;
					}
				}
			} else if (this.obj.shapeNickname == '智慧开关组件') {
				if (this.obj.dataConfig.deviceId == newvalue.device_id) {
					let obj = newvalue.data;
					if (!obj.st) {
						return;
					}
					if (obj.st.propertyValue) {
						for (let val of this.value) {
							val.value = obj.st.propertyValue[val.key2].propertyValue;
						}
					} else {
						let t = Object.entries(obj.st);
						for (let [key, val] of t) {
							let ele = this.value.find((e) => key === e.key2);
							if (ele) {
								ele.value = val;
							}
						}
					}
				}
			} else if (this.obj.shapeNickname == '扩声组件（智慧运算中心）') {
				if (this.obj.dataConfig.deviceId == newvalue.device_id) {
					let obj = newvalue.data;
					if (!obj.OUTMS) {
						return;
					}
					if (obj.OUTMS.propertyValue) {
						this.value = obj.OUTMS.propertyValue;
					} else {
						this.value = obj.OUTMS;
					}
				}
			} else if (this.obj.shapeNickname == '灯光组件') {
				// 灯光分两个 开关 和 数值回显
				let obj = newvalue.data;
				// 开关
				let d1 = this.on_off.find((e) => e.device_id === newvalue.device_id);
				if (d1) {
					if (!obj.st) {
						return;
					}
					if (obj.st.propertyValue) {
						for (let val of d1.channel) {
							val.value = obj.st.propertyValue[val.key2].propertyValue;
						}
					} else {
						let t = Object.entries(obj.st);
						for (let [key, val] of t) {
							let ele = d1.channel.find((e) => e.key2 === key);
							if (ele) {
								ele.value = val;
							}
						}
					}
				}
				// 数值
				let d2 = this.obj.dataConfig.lightConfig.some((e) => e.deviceId === newvalue.device_id);
				if (d2) {
					if (!obj.st) {
						return;
					}
					if (obj.st.propertyValue) {
						this.value = obj.st.propertyValue.bri.propertyValue;
					} else {
						for (let key in obj.st) {
							switch (key) {
								case 'bri':
									this.value = Number(obj.st.bri);
									break;
							}
						}
					}
				}
			} else if (this.obj.shapeNickname == '智慧运算中心-IN' || this.obj.shapeNickname == '智慧运算中心-OUT') {
				if (this.obj.dataConfig.deviceId == newvalue.device_id) {
					let obj = newvalue.data;
					let type = this.obj.shapeNickname == '智慧运算中心-IN' ? true : false;
					let key1 = type ? 'INGS' : 'OUTGS';
					if (obj[key1]) {
						let t;
						if (obj[key1].propertyValue) {
							t = obj[key1].propertyValue;
						} else {
							t = obj[key1];
						}
						for (let i = 0; i < t.length; i++) {
							let tt = Math.floor(t[i] / 10 + 0.5) / 10;
							if (tt < this.gain_min) {
								tt = this.gain_min;
							} else if (tt > this.gain_max) {
								tt = this.gain_max;
							}
							this.channel[i].gain = tt;
						}
					}
					let key2 = type ? 'ILEVEL' : 'OLEVEL';
					if (obj[key2]) {
						let t;
						if (obj[key2].propertyValue) {
							t = obj[key2].propertyValue;
						} else {
							t = obj[key2];
						}
						for (let i = 0; i < t.length; i++) {
							let tt = Math.floor(t[i] / 100);
							if (tt < this.level_min) {
								tt = this.level_min;
							} else if (tt > this.level_max) {
								tt = this.level_max;
							}
							this.channel[i].level = tt;
						}
					}
					let key3 = type ? 'INMS' : 'OUTMS';
					if (obj[key3]) {
						let t;
						if (obj[key3].propertyValue) {
							t = obj[key3].propertyValue;
						} else {
							t = obj[key3];
						}
						for (let i = 0; i < t.length; i++) {
							this.channel[i].mute = t[i];
						}
					}
				}
			} else {
				// 有回显数据时 传入的是一个原始结构对象 根据path属性解析路径取任意层级的值
				// 此时是在组件挂载完毕时接收到的数据 path已经有了
				if (this.path_list?.length === 1 && this.obj.attr[0].deviceId === newvalue.device_id) {
					// path_list未就绪或者未绑定属性
					// path_list绑定多个属性也不回显
					// 组件关联设备id不匹配
					// 到这一步说明当前数据与当前组件相关 进行进一步路径解析
					// 每一条数据 只跟一个设备相关
					// 虽然可以绑定多个属性 但是回显会冲突 因此只取一个属性值作为代表
					let index = 0;
					this.analysis_path(this.path_list[0].path, index, newvalue.data);
				}
			}
		},
	},
};
// 容器组件
let customContainer = {
	template: `
    <div :style="cus_style(obj)" @click="send_order(undefined)"></div>
  `,
	mixins: [common_functions, fn],
	methods: {
		// 容器样式
		cus_style(obj) {
			let t = this.style(obj);
			if (obj.style.backgroundColor) {
				t['backgroundColor'] = obj.style.backgroundColor;
			}
			if (obj.style.backgroundImg) {
				t['backgroundImage'] = obj.style.backgroundImg;
			}
			return t;
		},
	},
};
// 文本框
let customText = {
	template: `
    <div class="custom_text" :style="cus_style(obj)" @click="turn_to_page" :title="value">
      <span class="content">{{value}}</span>
    </div>
  `,
	data() {
		return {
			value: this.obj.value || '',
		};
	},
	mixins: [common_functions, fn],
	methods: {
		// 有跳转id时 进行跳转功能
		turn_to_page() {
			this.obj.jumpTo?.length && this.$bus.$emit('turn_to_page', this.obj.jumpTo[this.obj.jumpTo.length - 1]);
		},
		// 文本框样式
		cus_style(obj_data) {
			let t = this.style(obj_data);
			if (obj_data.style.fontSize) {
				t['fontSize'] = obj_data.style.fontSize * this.radio + 'px';
			} else {
				t['fontSize'] = 14 * this.radio + 'px';
			}
			if (obj_data.style.fontWeight) {
				t['fontWeight'] = obj_data.style.fontWeight;
			}
			if (obj_data.style.fontColor) {
				t['color'] = obj_data.style.fontColor;
			}
			if (obj_data.style.backgroundColor) {
				t['backgroundColor'] = obj_data.style.backgroundColor;
			}
			if (obj_data.style.strokeWidth) {
				t['borderWidth'] = obj_data.style.strokeWidth + 'px';
			}
			if (obj_data.style.stroke) {
				t['borderColor'] = obj_data.style.stroke;
			}
			if (obj_data.url) {
				t['cursor'] = 'pointer';
			}
			return t;
		},
	},
};
// 开关
let customSwitch = {
	template: `
    <div :style="style(obj)" class="switch_box" @click="switch_fn">
      <img v-show="value===on_value" :src="src(true)" class="bg_img" draggable="false">
      <img v-show="value===off_value" :src="src(false)" class="bg_img" draggable="false">
    </div>
  `,
	mixins: [common_functions, fn],
	data() {
		return {
			value: '0', //当前值
			on_value: '1', //开的值
			off_value: '0', //关的值
		};
	},
	created() {
		for (let val of this.obj.dataConfig) {
			switch (val.nickName) {
				case '开值':
					this.on_value = val.value;
					break;
				case '关值':
					this.off_value = val.value;
					break;
			}
		}
		this.value = this.off_value;
	},
	methods: {
		switch_fn() {
			if (this.value === this.on_value) {
				this.value = this.off_value;
			} else if (this.value === this.off_value) {
				this.value = this.on_value;
			}
			let data;
			switch (this.data_type) {
				case 'int':
				case 'float':
				case 'double':
				case 'any':
					data = parseInt(this.value);
					break;
				case 'array':
				case 'struct':
					data = JSON.parse(this.value);
					break;
				default:
					data = this.value;
					break;
			}
			this.send_order(data);
		},
		// 根据组件类别区分显示图
		src(flag) {
			switch (this.obj.type) {
				case 'switch1':
					if (flag) {
						return './img/icon16.png';
					} else {
						return './img/icon17.png';
					}
				case 'switch1V':
					if (flag) {
						return './img/icon3.png';
					} else {
						return './img/icon4.png';
					}
				case 'switch2':
					if (flag) {
						return './img/icon11.png';
					} else {
						return './img/icon12.png';
					}
			}
		},
	},
};
// 滑块组件 竖
let customSlider = {
	template: `
    <div class="slider_box" :style="style(obj)">
      <img src="./img/icon6.png" class="bg_img">
      <div class="text text_ellipsis flex_shrink center" :title="value_text">
        {{value_text}}
        <img src="img/icon14.png" class="bg_img">
      </div>
      <div class="box1">
        <img src="./img/icon5.png" class="bg_img">
        <el-slider v-model="value" @change="send_order($event)" vertical :show-tooltip="false" :min="min" :max="max" :step="step"></el-slider>
      </div>
    </div>
  `,
	mixins: [common_functions, fn],
	data() {
		return {
			value: 0,
			step: 1, //步长
			min: 0,
			max: 10,
			units: '', //单位
		};
	},
	created() {
		for (let val of this.obj.dataConfig) {
			switch (val.nickName) {
				case '步长值':
					this.step = Number(val.value);
					break;
				case '最小值':
					this.min = val.value;
					break;
				case '最大值':
					this.max = val.value;
					break;
				case '单位':
					this.units = val.value;
					break;
			}
		}
		this.value = this.min;
	},
	computed: {
		accuracy() {
			let t = this.step + '';
			let t2 = t.split('.')[1];
			if (t2) {
				return t2.length;
			} else {
				return 0;
			}
		},
		value_text() {
			return `${this.value}${this.units ? ' ' + this.units : ''}`;
		},
	},
};
// 滑块组件 横
let customSlider2 = {
	template: `
    <div class="slider_box2" :style="style(obj)">
      <img src="./img/icon13.png" class="bg_img">
      <div class="text text_ellipsis flex_shrink center" :title="value_text">
        {{value_text}}
        <img src="img/icon14.png" class="bg_img">
      </div>
      <div class="box1">
        <img src="./img/icon15.png" class="bg_img">
        <el-slider v-model="value" @change="send_order($event)" :show-tooltip="false" :min="min" :max="max"
          :step="step" style="width:90%"></el-slider>
      </div>
    </div>
  `,
	mixins: [common_functions, fn],
	data() {
		return {
			value: 0,
			step: 1, //步长
			min: 0,
			max: 10,
			units: '', //单位
		};
	},
	created() {
		for (let val of this.obj.dataConfig) {
			switch (val.nickName) {
				case '步长值':
					this.step = Number(val.value);
					break;
				case '最小值':
					this.min = val.value;
					break;
				case '最大值':
					this.max = val.value;
					break;
				case '单位':
					this.units = val.value;
					break;
			}
		}
		this.value = this.min;
	},
	computed: {
		accuracy() {
			let t = this.step + '';
			let t2 = t.split('.')[1];
			if (t2) {
				return t2.length;
			} else {
				return 0;
			}
		},
		value_text() {
			return `${this.value}${this.units ? ' ' + this.units : ''}`;
		},
	},
};
// 图片
let customImg = {
	template: `
    <div :class="[url? '' : 'center']" @click="turn_to_page" :style="style(obj)">
      <img v-if="url" class="bg_img" :src="url">
      <div v-else>无图片</div>
    </div>
  `,
	mixins: [common_functions, fn],
	computed: {
		url() {
			let t = /^http/;
			if (t.test(this.obj.style.backgroundImg)) {
				// 是http开头说明是图片
				return this.obj.style.backgroundImg;
			} else {
				return '';
			}
		},
	},
	methods: {
		// 有跳转id时 进行跳转功能
		turn_to_page() {
			this.obj.jumpTo?.length && this.$bus.$emit('turn_to_page', this.obj.jumpTo[this.obj.jumpTo.length - 1]);
		},
	},
};
// 视频
let customVideo = {
	template: `
    <video :style="style(obj)" :id="obj.id" controls autoplay muted></video>
  `,
	mixins: [common_functions, fn],
	mounted() {
		let dom = document.getElementById(`${this.obj.id}`);
		if (flvjs.isSupported()) {
			player = flvjs.createPlayer(
				{
					type: this.obj.videoConfig.proxy.label, //媒体类型
					url: this.obj.videoConfig.proxy.value, //数据源地址
					isLive: true, //是否为直播流
					// hasAudio: false, //数据源是否包含有音频
					// hasVideo: true, //数据源是否包含有视频
					// enableStashBuffer: false, //是否启用缓存区
					controls: false,
					autoplay: true,
				},
				{
					enableWorker: true, //启用分离线程
					// enableStashBuffer: false, //关闭IO隐藏缓冲区
					autoCleanupSourceBuffer: true, //自动清除缓存
					stashInitialsize: 128, //减少首恢显示等待时长
				}
			);
			player.attachMediaElement(dom); //将实例注册到节点
			player.load(); //加载数据流
			player.play(); //播放数据流
			// 报错回调
			player.on(flvjs.Events.ERROR, (errorType, detail, info) => {
				console.log('视频报错', errorType, detail, info);
			});
			// 备用
			// flvPlayer.pause(); //暂停播放数据流
			// flvPlayer.unload(); //取消数据流加载
			// flvPlayer.detachMediaElement(); //将播放实例从节点中取出
			// flvPlayer.destroy(); //销毁播放实例
		}
	},
};
// svg图形
// 连线
let customLine = {
	template: `
    <svg :style="cus_style(panel)">
      <!-- 预设的箭头图标 -->
      <defs>
        <marker :id="cus_id('arrow-end')" refX="-3" orient="auto" markerUnits="userSpaceOnUse" overflow="visible">
          <path class="arrow" :style="mark_style()" transform="rotate(180)" d="M 0 0 L 20 -10 L 16 0 L 20 10 Z"></path>
        </marker>

        <marker :id="cus_id('arrow-start')" refX="3" orient="auto" markerUnits="userSpaceOnUse" overflow="visible">
          <path class="arrow" :style="mark_style()" d="M 0 0 L 20 -10 L 16 0 L 20 10 Z"></path>
        </marker>

        <marker :id="cus_id('err-end')" markerUnits="userSpaceOnUse" overflow="visible" orient="auto" refY="20" refX="40">
          <path d="M10 10 L30 30 M30 10 L10 30" stroke="red" stroke-width="3"></path>
        </marker>

        <marker :id="cus_id('err-start')" markerUnits="userSpaceOnUse" overflow="visible" orient="auto" refY="20" refX="0">
          <path d="M10 10 L30 30 M30 10 L10 30" stroke="red" stroke-width="3"></path>
        </marker>

        <marker :id="cus_id('dot')" markerUnits="userSpaceOnUse" overflow="visible" refX="10" refY="5">
          <circle class="arrow" cx="10" cy="10" r="10" :style="mark_style()"></circle>
        </marker>
      </defs>

      <path :class="['path',isBidirect?'path_bothway':'path_line']" :d="line_path" :style="line_style()"></path>
    </svg>
  `,
	props: ['panel', 'mouse_p'],
	mixins: [common_functions, fn],
	data() {
		return {
			// 不能用一个标识表示 因为是由两个设备状态组合判断 而每次收到的消息只有一台设备
			target_status: true, // 终端设备状态
			source_status: true, // 起始设备状态
			isBidirect: this.obj.rawData.data.isBidirect || false, // 是否应用双向样式
			line_info: null, // 给个初始值null 当有值时会更新 connect
		};
	},
	beforeMount() {
		let arr = this.obj.rawData.data.edgeConfig;
		if (arr?.length) {
			// 保存线上需要显示的信息
			this.line_info = [];
			for (let val of arr) {
				let t = {
					start: {
						device_id: val.startDevice, // 判断设备上报信息的条件
						name: val.startNickname, // 显示在页面上的内容
						status: true, // 存储设备上报的自身接口状态
					},
					end: {
						device_id: val.endDevice,
						name: val.endNickname,
						status: true,
					},
					status: true, // 接口线路的状态图标标识 由设备在线状态、接口状态共同决定
					msg: '连接正常', // 显示线路状态信息
				};
				// 显示在页面的线路材质信息
				switch (val.connectionType) {
					case '0':
						t.type = '音频线';
						break;
					case '1':
						t.type = '视频线';
						break;
					case '2':
						t.type = '网线';
						break;
				}
				// 匹配设备上报接口状态字段
				if (val.startPort?.length) {
					// 因为结构是固定的只有一层 所以可以简单的这样截取
					t.start.identifier = val.startPort.pop().split('.').pop();
				}
				if (val.endPort?.length) {
					t.end.identifier = val.endPort.pop().split('.').pop();
				}
				this.line_info.push(t);
			}
			// 保存鼠标移动判断所需的线的相关数据
			// 将连线拆分成线段并拉伸成宽度10的矩形
			// 将连线以拐点切分
			let l1 = this.line_path.split(/\s?[A-Z]\s/);
			// 分割的数组首位是空元素要去掉
			l1.shift();
			this.lines = this.line_scope(l1);
		}
	},
	methods: {
		cus_style(panel) {
			return {
				position: 'absolute',
				// zIndex: obj.z_index,
				zIndex: -10,
				left: 0,
				top: 0,
				width: '100%',
				height: `${panel.mb.h * this.radio}px`,
			};
		},
		// 线的样式 因为线末尾的箭头是必须动态添加的 所以要保留
		line_style() {
			let t = {
				markerEnd: this.connect ? `url(#${this.obj.id}-arrow-end)` : `url(#${this.obj.id}-err-end)`,
			};
			if (this.obj.lineStyle.strokeWidth) {
				t.strokeWidth = this.obj.lineStyle.strokeWidth;
			}
			if (this.obj.lineStyle.strokeDasharray) {
				t.strokeDasharray = this.obj.lineStyle.strokeDasharray;
			}
			if (this.obj.lineStyle.stroke) {
				t.stroke = this.obj.lineStyle.stroke;
			}
			// 断连的红色优先级最高 放在下面
			// 没有断连 就使用默认样式
			if (!this.connect) {
				t.stroke = 'red';
			}
			// 读取线段样式
			// 如果是双向要设置起始箭头
			if (this.isBidirect) {
				t.markerStart = this.connect ? `url(#${this.obj.id}-arrow-start)` : `url(#${this.obj.id}-err-start)`;
			}
			return t;
		},
		// 箭头样式
		mark_style() {
			let t = {};
			if (this.obj.lineStyle.stroke) {
				t.stroke = this.obj.lineStyle.stroke;
				t.fill = this.obj.lineStyle.stroke;
			}
			// 不论是什么线 只要是断开的都是红色
			if (!this.connect) {
				t.fill = 'red';
				t.stroke = 'red';
			}
			return t;
		},
		// 自定义id 多个svg画布 有重复id 要做区分
		cus_id(type) {
			return `${this.obj.id}-${type}`;
		},
		// 将线段处理成矩阵
		line_scope(list) {
			// 粗细参数
			let size = 16; // 默认线宽5 可触发宽度是16
			if (this.obj.lineStyle.strokeWidth) {
				size = Number(this.obj.lineStyle.strokeWidth) * 2;
			}
			let arr = [];
			// 线段数是点的个数-1
			for (let i = 0; i < list.length - 1; i++) {
				// 判断根据相邻点确定线段横纵
				let xy = list[i].split(' ');
				let x1 = Number(xy[0]);
				let y1 = Number(xy[1]);
				xy = list[i + 1].split(' ');
				let x2 = Number(xy[0]);
				let y2 = Number(xy[1]);
				// x轴相等则是纵向 y轴相等则是横向
				// 根据方向对线段进行扩充 横向拉伸Y轴 纵向拉伸X轴
				if (x1 == x2) {
					arr.push({
						left: x1 - size / 2,
						right: x1 + size / 2,
						top: y1,
						bottom: y2,
					});
				} else if (y1 == y2) {
					arr.push({
						left: x1,
						right: x2,
						top: y1 - size / 2,
						bottom: y1 + size / 2,
					});
				}
			}
			return arr;
		},
	},
	computed: {
		// 连线路径要等比例缩放
		line_path() {
			let res = this.obj.path.matchAll(/\d+(\.\d+)?/g);
			// 根据匹配值的位置索引 将改变的值插入
			let list = [];
			for (let val of res) {
				let t = {
					value: Number(val['0']) * this.radio,
					index: val.index,
					extent: val['0'].length,
				};
				list.push(t);
			}
			// 此处就能判断路径点个数 只有2个点说明是横纵直线 marker-mid不能生效
			// 因此需要特殊处理 中间加个点
			let mid = '';
			if (list.length === 4) {
				// 因为只有横线 或 纵线 所以只考虑X或Y坐标
				if (list[0].value === list[2].value) {
					// 说明是纵线
					let t = (list[3].value - list[1].value) / 2 + list[1].value;
					// 注意L前没空格 坐标后有空格
					mid = `L ${list[0].value} ${t} `;
				} else {
					// 横线
					let t = (list[2].value - list[0].value) / 2 + list[0].value;
					mid = `L ${t} ${list[1].value} `;
				}
			}
			// 将原始字符串处理成数组
			let str_list = this.obj.path.split('');
			// 注：拆成数组的时候是以每个字符分割 修改数组的时候是将原长度个数的元素改为一个元素 因此长度缩减 extent-1
			// 下一轮修改数组时要将索引减去之前元素导致数组缩减的长度
			let de_count = 0;
			for (let i = 0; i < list.length; i++) {
				let now = list[i];
				if (i) {
					de_count += list[i - 1].extent - 1;
				}
				// 根据匹配值的起始位置索引 删除字符长度的元素 再加入新数据
				str_list.splice(now.index - de_count, now.extent, now.value);
			}

			// 判断是否为直线 如果是 将中间点字符串插入到末尾点的字母前面
			if (mid) {
				// 格式一定是 M x y L x y
				let i = str_list.indexOf('L');
				str_list.splice(i, 0, mid);
			}
			// 将修改后的数组合并为字符串
			let str = str_list.join('');
			return str;
		},
		// 连接标识 由两个设备状态共同决定
		// 用计算属性监听设备状态 如果发生改变则重新判断
		connect() {
			// 两端设备全部在线 且 接口连线全部正常
			let status = true;
			if (this.line_info) {
				for (let val of this.line_info) {
					if (!val.status) {
						status = false;
						break;
					}
				}
			}
			return this.target_status && this.source_status && status;
		},
	},
	watch: {
		// 收到改变的坐标后检测是否在自身范围
		mouse_p(newvalue) {
			if (this.lines) {
				let find = false;
				// 判断鼠标位置是否在任一段矩形中
				for (let val of this.lines) {
					// 鼠标坐标要加上滚动偏移
					if (newvalue.x >= val.left && newvalue.x <= val.right && newvalue.y + newvalue.scroll_top >= val.top && newvalue.y + newvalue.scroll_top <= val.bottom) {
						// 在范围内则 往父页面发送线中存储的信息
						if (this.line_info.length) {
							find = true;
							this.$bus.$emit('line_info', { list: this.line_info, isBidirect: this.isBidirect, is_in_range: true });
						}
						break;
					}
				}
				// 如果不在当前连线范围内 则通知父页面 父页面在统计所有连线都不在范围内后 隐藏弹窗
				if (!find) {
					this.$bus.$emit('line_info', { is_in_range: false });
				}
			}
		},
	},
};
// 设备节点状态显示
let customDeviceStatus = {
	template: `
  <div :style="style(obj)" @mouseenter="hover(true)" @mouseleave="hover(false)" @click="go_to">
    <img class="bg_img" :src="obj.imageUrl" style="object-fit:contain;">
    <!-- 设备名称 -->
    <div class="device_name" :style="{fontSize:设备名}">{{obj.nickName}}</div>
  </div>
`,
	mixins: [common_functions, fn],
	data() {
		return {
			status: [], // 设备属性列表
			is_normal: true, //设备是否异常
			has_status: this.obj.dataConfig.showStat || false, // 设备节点是否开启状态面板
		};
	},
	beforeMount() {
		// 初始化状态列表
		if (this.obj.dataConfig?.nodeData) {
			for (let val of this.obj.dataConfig.nodeData) {
				let t = {
					label: val.attrName,
					path: this.init_path(val.attrPath),
					value: '', //初始为空 等收到消息解析后赋值
					// type: val.attrType, // 只是文本显示 不需要格式转换
				};
				this.status.push(t);
			}
		}
	},
	methods: {
		// 跳转到设备页
		// 设备页需要区分可视化等参数 只需要返回给外层页面设备id 由外层页面查
		go_to() {
			// window.parent.postMessage({ device_id: this.obj.dataConfig.deviceId });
			if (!this.obj.dataConfig.deviceId) {
				return;
			}
			this.request('get', `${device_detail_url}/${this.obj.dataConfig.deviceId}`, this.token, ({ data: res }) => {
				if (res.head.code !== 200) {
					this.$message('无设备信息');
					return;
				}
				if (res.data.visualizedFlag) {
					let name = encodeURIComponent(res.data.deviceName);
					window.open(`../index.html?type=Visual_Preview&token=${this.token}&deviceId=${res.data.id}&device_name=${name}`);
				} else if (res.data.productUrl) {
					let name = encodeURIComponent(res.data.deviceName);
					switch (res.data.productUrl) {
						case 'power_supply':
							window.open(
								`../index.html?type=${res.data.productUrl}&token=${this.token}&deviceId=${res.data.id}&device_name=${name}&ip=${我是接口地址}&clientId=0&tenantId=0&theme=dark&system=微服务&wsip=${我是websocket地址}`
							);
							break;
						default:
							window.open(`../index.html?type=${res.data.productUrl}&token=${this.token}&id=${res.data.id}&device_name=${name}`);
							break;
					}
				} else {
					this.$message('请配置产品调控页面前端标识后再试');
				}
			});
		},
		// 悬浮在设备节点时创造并显示 属性面板
		hover(show) {
			// 没有开启不执行
			if (!this.has_status) {
				return;
			}
			let { backgroundColor, h, textColor, w } = this.obj.dataConfig.statPanelStyle;
			// 浏览器缩放时 里面元素会等比例变化 只要对比原始大小是否超出宽度
			let left;
			let parent_left = (this.obj.x + this.obj.w) * this.radio;
			let c_w = document.documentElement.clientWidth;
			w = w * this.radio;
			if (w + parent_left > c_w) {
				left = `${this.obj.x * this.radio - w}px`;
			} else {
				left = `${parent_left}px`;
			}
			this.$bus.$emit('device_status', {
				list: this.status,
				show,
				style: {
					width: `${w}px`,
					// 默认显示在中心点右下
					top: `${(this.obj.h / 2 + this.obj.y) * this.radio}px`,
					backgroundColor,
					color: textColor,
					left,
				},
				name: this.obj.nickName,
				is_normal: this.is_normal,
			});
		},
	},
	computed: {
		设备名() {
			return `${16 * this.radio}px`;
		},
	},
};
// 按钮
let customButton = {
	template: `
    <div :style="style(obj)" class="center button_box" @click="turn_to_page">
      <img v-if="bg_url" :src="bg_url" class="bg_img">
      <img v-else src="./img/icon1.png" class="bg_img">
      <span :style="size(obj)">{{text}}</span>
    </div>
  `,
	mixins: [common_functions, fn],
	data() {
		return {
			bg_url: this.obj.data?.backgroundImg || false,
		};
	},
	methods: {
		size(obj_data) {
			if (this.obj.type === 'button') {
				let t = (203 / 22) * 16; //计算多少容器大小下 字体是16px
				let fz = (obj_data.w * this.radio) / t;
				return {
					color: '#fff',
					fontSize: fz + 'rem',
					zIndex: 1,
					whiteSpace: 'nowrap',
				};
			} else if (this.obj.shapeNickname === '自定义按钮') {
				let t = this.obj.data.attrs.label;
				return {
					color: t.fill,
					fontSize: t.fontSize - this.radio + 'px',
					fontWeight: t.fontWeight,
					zIndex: 1,
					whiteSpace: 'nowrap',
				};
			}
		},
		// 按钮分下发指令和切换页面两种
		turn_to_page() {
			this.send_order(undefined);
			this.obj.jumpTo?.length && this.$bus.$emit('turn_to_page', this.obj.jumpTo[this.obj.jumpTo.length - 1]);
		},
	},
	computed: {
		text() {
			if (this.obj.type === 'button') {
				return this.obj.dataConfig?.buttonLabel || '';
			} else if (this.obj.shapeNickname === '自定义按钮') {
				return this.obj.data.attrs.label.text || '';
			}
		},
	},
};
// 一键巡检
let customOnlineCheck = {
	template: `
    <div :style="style(obj)" class="button power_open col_layout" @click="check_devices">
      <img class="bg_img" src="./img/icon20.png">
      <div :style="cus_style()">{{title}}</div>
    </div>
  `,
	mixins: [common_functions, fn],
	props: ['is_checking', 'random_num'],
	data() {
		return {
			title: this.obj.data.attrs.label.text || '',
		};
	},
	methods: {
		async check_devices() {
			// 全局限制巡检按钮触发频率
			if (this.is_checking) {
				this.$message('巡检触发频率不能低于一分钟');
				return;
			}
			this.$emit('checking_event', true);
			setTimeout(() => {
				this.$emit('checking_event', false);
			}, 60000);
			// 从按钮绑定的behaviorList列表中取出绑定了服务的设备
			let list = [];
			this.check_list = [];
			for (let val of this.obj.behaviorList) {
				let t = { deviceId: val.deviceId };
				let t2 = {
					message_id: '',
					device_name: val.deviceName,
					device_id: val.deviceId,
					service_identifier: '',
					service_name: '',
					result: '巡检中',
				};
				if (!val.statusCheckConfig) {
					// 不检查在线状态 则添加服务
					t.serviceIdentifier = val.serviceIdentifier;
					t2.service_identifier = val.serviceIdentifier;
					t2.service_name = val.serviceName;
				}
				list.push(t);
				this.check_list.psuh(t2);
			}
			// 先打开弹窗等请求回来再加载数据
			this.$bus.$emit('online_check', { type: 'open', data: this.check_list });
			// 取得每个请求关联的消息id
			let { data: res } = await this.request('post', `${online_check_url}/${this.random_num}`, this.token, list).catch((err) => false);
			if (res?.head.code !== 200) {
				return;
			}
			// 存储消息id列表 等到推流消息时查看是否有对应id
			for (let val of res.data) {
				// 获取服务名称
				for (let val2 of this.check_list) {
					if (val.deviceId == val2.device_id && val.serviceIdentifier == val2.service_identifier) {
						val2.message_id = val.messageId;
						break;
					}
				}
			}
			// 发送消息 打开弹窗
			this.$bus.$emit('online_check', { type: 'open', data: this.check_list });
		},
		cus_style() {
			let t = this.obj.data.attrs.label;
			return {
				fontSize: t.fontSize * this.radio + 'px',
				fontWeight: t.fontWeight,
				color: t.fill,
				position: 'relative',
				top: '16%',
			};
		},
	},
};
// 预设组件 zhr的原始数据 内嵌iframe
let customVisualEditor1 = {
	template: `
    <iframe :id="id" :src="url" :style="style(obj)" frameborder="0" scrolling="no"></iframe>
  `,
	mixins: [common_functions, fn],
	data() {
		return {
			url: '', // 固定的跳转地址
			id: `zhr-${this.obj.id}`, // 组件唯一id 为了挂载时往其中传数据
		};
	},
	beforeMount() {
		if (this.token && this.obj.dataConfig.deviceId) {
			this.url = `../index.html?type=Visual_Preview&token=${this.token}&deviceId=${this.obj.dataConfig.deviceId}`;
		} else {
			this.url = '../index.html?type=Visual_Preview&token';
		}
	},
	mounted() {
		let dom = document.getElementById(this.id);
		// 原始数据是单页的 但是传给子页面的得是数组
		dom.contentWindow.postMessage([this.obj.dataConfig.originalRawDataConfig]);
	},
};
// 音频矩阵按钮
let customSoundMatrix = {
	template: `
    <div class="button center" :style="style(obj)" @click="show_matrix">
      <img v-if="type===1" class="bg_img" src="./img/icon25.png">
      <template v-if="type===2">
        <img src="./img/icon1.png" class="bg_img">
        <div :style="cus_style()">{{title}}</div>
      </template>
      <template v-if="type===3">
        <img src="./img/icon21.png" class="bg_img">
        <div :style="cus_style()">{{title}}</div>
      </template>
    </div>
  `,
	mixins: [common_functions, fn],
	data() {
		return {
			title: this.obj.data.attrs.label.text || '',
		};
	},
	methods: {
		// 显示矩阵弹窗
		show_matrix() {
			this.$bus.$emit('matrix_popup', {
				type: 'open',
				data: this.value,
				device_id: this.obj.dataConfig.deviceId,
				title: '音频矩阵',
			});
		},
		cus_style() {
			let t = this.obj.data.attrs.label;
			return {
				fontSize: t.fontSize * this.radio + 'px',
				fontWeight: t.fontWeight,
				color: t.fill,
				position: 'relative',
			};
		},
	},
	computed: {
		type() {
			switch (this.obj.data.preset) {
				case '音频矩阵-样式一':
					return 1;
				case '音频矩阵-样式二':
					return 2;
				case '音频矩阵-样式三':
					return 3;
			}
		},
	},
};
// 音频矩阵组件
let soundMatrix = {
	template: `
  <div class="sound_matrix">
    <div class="head">
      <div class="title" v-for="num,index in 13">
        {{index>0?'IN'+index:''}}
      </div>
    </div>

    <div class="body">
      <div class="col">
        <div class="title" v-for="num in 9">
          {{'OUT'+num}}
        </div>
      </div>

      <div class="body">
        <div class="row" v-for="row,row_i in list">
          <div class="button" v-for="col,col_i in row" @click="matrix_order(col,row_i,col_i)">
            <img v-show="col==1" src="./img/icon23.png" class="bg_img">
            <img v-show="col==0" src="./img/icon24.png" class="bg_img">
          </div>
        </div>
      </div>
    </div>
  </div>
  `,
	mixins: [common_functions],
	props: ['list', 'device_id', 'token'],
	methods: {
		matrix_order(value, row_i, col_i) {
			// 修改回显值
			this.list[row_i].splice(col_i, 1, Number(value) ? '0' : '1');
			// 下发指令
			let data = [];
			for (let row of this.list) {
				let t = JSON.parse(JSON.stringify(row));
				let t2 = parseInt(t.reverse().join(''));
				let t3 = parseInt(t2, 2) >> 0;
				data.push(t3, 0);
			}
			// 因为只绑定了设备id 且这是自己创建的组件不是编辑器里的所以没有存属性
			let body = {
				contentType: 0,
				deviceId: this.device_id,
			};
			body.attributeMap = {
				MIXS: data,
			};
			this.request('put', `${sendCmdtoDevice}/8`, this.token, body);
		},
	},
};
// 视频矩阵按钮
let customVideoMatrix = {
	template: `
    <div class="button center" :style="style(obj)" @click="show_matrix">
      <img v-if="type===1" class="bg_img" src="./img/icon22.png">
      <template v-if="type===2">
        <img src="./img/icon1.png" class="bg_img">
        <div :style="cus_style()">{{title}}</div>
      </template>
      <template v-if="type===3">
        <img src="./img/icon48.png" class="bg_img">
        <div :style="cus_style()">{{title}}</div>
      </template>
    </div>
  `,
	mixins: [common_functions, fn],
	data() {
		return {
			title: this.obj.data.attrs.label.text || '',
		};
	},
	methods: {
		// 显示矩阵弹窗
		show_matrix() {
			let t = {
				type: 'open',
				data: this.value,
				device_id: this.obj.dataConfig.deviceId,
			};
			// 区分一代还是二代
			switch (this.obj.dataConfig.productId) {
				case '1564171104871739392':
					// 一代
					t.title = '视频矩阵一代';
					this.$bus.$emit('matrix_popup', t);
					break;
				case '1722147067370217472':
					// 二代
					t.title = '视频矩阵二代';
					this.$bus.$emit('matrix_popup', t);
					break;
			}
		},
		cus_style() {
			let t = this.obj.data.attrs.label;
			return {
				fontSize: t.fontSize * this.radio + 'px',
				fontWeight: t.fontWeight,
				color: t.fill,
				position: 'relative',
			};
		},
	},
	computed: {
		type() {
			switch (this.obj.data.preset) {
				case '视频矩阵-样式一':
					return 1;
				case '视频矩阵-样式二':
					return 2;
				case '视频矩阵-样式三':
					return 3;
			}
		},
	},
};
// 视频矩阵一代
let videoMatrix1 = {
	template: `
    <div class="video_matrix" style="grid-template-rows: repeat(2, 70px)">
      <div class="button center" v-for="item,index in label_list" @click="matrix_order(index)">
        <img v-show="!matrix_status(index)" src="./img/icon26.png" class="bg_img">
        <img v-show="matrix_status(index)" src="./img/icon27.png" class="bg_img">
        <span>{{item}}</span>
      </div>
    </div>
  `,
	mixins: [common_functions],
	props: ['list', 'device_id', 'token'],
	data() {
		return {
			label_list: ['IN1->OUTA', 'IN2->OUTA', 'IN3->OUTA', 'IN4->OUTA', 'IN1->OUTB', 'IN2->OUTB', 'IN3->OUTB', 'IN4->OUTB'],
		};
	},
	methods: {
		// 视频矩阵回显
		matrix_status(index) {
			if (index < 4) {
				if (index + 1 == this.list[0]) {
					return true;
				} else {
					return false;
				}
			} else {
				if (index - 3 == this.list[1]) {
					return true;
				} else {
					return false;
				}
			}
		},
		matrix_order(value) {
			// 因为只绑定了设备id 且这是自己创建的组件不是编辑器里的所以没有存属性
			let body = {
				contentType: 0,
				deviceId: this.device_id,
			};
			if (value < 4) {
				let t = value + 1;
				body.attributeMap = {
					VSWT: [t, 255],
				};
				this.list.splice(0, 1, t);
			} else {
				let t = value - 3;
				body.attributeMap = {
					VSWT: [255, t],
				};
				this.list.splice(1, 1, t);
			}
			this.request('put', `${sendCmdtoDevice}/8`, this.token, body);
		},
	},
};
// 视频矩阵二代
let videoMatrix2 = {
	template: `
    <div class="video_matrix">
      <div class="button center" v-for="item,index in label_list" @click="matrix_order(item.value, index)">
        <img v-show="!matrix_status(index)" src="./img/icon26.png" class="bg_img">
        <img v-show="matrix_status(index)" src="./img/icon27.png" class="bg_img">
        <span>{{item.label}}</span>
      </div>
    </div>
  `,
	mixins: [common_functions],
	props: ['list', 'device_id', 'token'],
	data() {
		return {
			label_list: [],
		};
	},
	beforeMount() {
		// 生成视频控制按钮
		for (let row = 0; row < 4; row++) {
			for (let col = 0; col < 4; col++) {
				let t = {
					label: `In${col + 1}->Out${row + 1}`,
					value: [col, row],
				};
				this.label_list.push(t);
			}
		}
	},
	methods: {
		// 视频矩阵回显
		matrix_status(index) {
			if (this.list[Math.floor(index / 4)] === index % 4) {
				return true;
			} else {
				return false;
			}
		},
		matrix_order(value, index) {
			// 因为只绑定了设备id 且这是自己创建的组件不是编辑器里的所以没有存属性
			this.list.splice(Math.floor(index / 4), 1, index % 4);
			let body = {
				contentType: 0,
				deviceId: this.device_id,
				attributeMap: {
					VSWT: this.list,
				},
			};
			this.request('put', `${sendCmdtoDevice}/8`, this.token, body);
		},
	},
};
// 按钮开关
let customButtonSwitch = {
	template: `
    <div :style="style(obj)" class="center switch_box button" @click="switch_fn">
      <div :style="bg()" class="bg_img"></div>
      <span :style="size(obj)">{{value===on_value?text2:text}}</span>
    </div>
  `,
	mixins: [common_functions, fn],
	data() {
		return {
			value: this.obj.dataConfig[1].value || '0', //当前值
			text: this.obj.data.buttonText || '',
			text2: this.obj.data.activeText || '',
			on_value: this.obj.dataConfig[0].value || '1', //开的值
			off_value: this.obj.dataConfig[1].value || '0', //关的值
		};
	},
	methods: {
		switch_fn() {
			if (this.value === this.on_value) {
				this.value = this.off_value;
			} else if (this.value === this.off_value) {
				this.value = this.on_value;
			}
			let data;
			switch (this.data_type) {
				case 'int':
				case 'float':
				case 'double':
				case 'any':
					data = parseInt(this.value);
					break;
				case 'array':
				case 'struct':
					data = JSON.parse(this.value);
					break;
				default:
					data = this.value;
					break;
			}
			this.send_order(data);
		},
		size(obj_data) {
			let t = (203 / 22) * 16; //计算多少容器大小下 字体是16px
			let fz = (obj_data.w * this.radio) / t;
			return {
				color: '#fff',
				fontSize: fz + 'rem',
				zIndex: 1,
			};
		},
		bg() {
			return {
				background: this.value === this.on_value ? this.obj.data.onColor : this.obj.data.backColor,
			};
		},
	},
};
// 进度条
let customProgress = {
	template: `
    <div class="progress_box" :style="style(obj)">
      <img src="./img/icon7.png" class="bg_img">
      <span class="text" style="margin: 20px 0 10px 0;">{{max}}</span>
      <div class="progress">
        <div class="lump flex_shrink" v-for="i in total_num" :style="color(i)"></div>
      </div>
      <span class="text" style="margin: 10px 0 20px 0;">{{min}}</span>
    </div>
  `,
	mixins: [common_functions, fn],
	data() {
		return {
			block_h: 12, //方块大小
			value: 0,
			max: this.obj.dataConfig[1].value, // 最大值
			min: this.obj.dataConfig[0].value, // 最小值
		};
	},
	methods: {
		color(index) {
			// 10是单位，一个小方格大小+间隔=10
			let color;
			let max = Math.floor((this.total_height * 0.1) / this.block_h + 0.5);
			let mid = Math.floor((this.total_height * 0.2) / this.block_h + 0.5);
			let min = Math.floor((this.total_height * 0.3) / this.block_h + 0.5);
			if (index < max) {
				color = '#AB152E';
			} else if (index >= max && index < mid) {
				color = '#CB7E05';
			} else if (index >= mid && index < min) {
				color = '#1594FF';
			} else {
				color = '#1560FF';
			}
			// 显示效果时从下往上，但是节点渲染是从上往下，所以要用总数-基数
			let opacity = '0.5'; //单独维护的色块透明度
			if (index > this.render_num) {
				opacity = '1';
			}
			return { background: color, opacity: opacity };
		},
	},
	computed: {
		total_num() {
			return Math.floor(this.total_height / this.block_h);
		},
		render_num() {
			// 计算回显值占方块数
			let per = (this.value - this.min) / (this.max - this.min);
			let n = Math.floor((this.total_height * per) / this.block_h + 0.5);
			return this.total_num - n;
		},
		total_height() {
			return this.obj.h * this.radio - 40;
		},
	},
	watch: {
		value() {
			if (this.value < this.min) {
				this.value = this.min;
			} else if (this.value > this.max) {
				this.value = this.max;
			}
		},
	},
};
// 输入框
let customInput = {
	template: `
    <el-input class="input_style" v-model="value" @change="comfirm_input" :style="style(obj)" :placeholder="obj.dataConfig[0].value" type="text"
      :maxlength="obj.dataConfig[1].value" show-word-limit>
    </el-input>
  `,
	mixins: [common_functions, fn],
	data() {
		return {
			value: '',
		};
	},
	methods: {
		// 失去焦点或按下回车时提示确认下发指令信息
		async comfirm_input() {
			// 根据绑定属性转换输入值 如果没绑定属性则不进行
			if (!this.path_list.length) {
				return;
			}
			let value = Number(this.value);
			if (this.data_type === 'int' || this.data_type === 'float' || this.data_type === 'double') {
				// 如果绑定属性是数字但是输入内容无法转换成数字 则提示
				if (isNaN(value)) {
					this.$alert('输入内容与属性类型不符', '提示', {
						confirmButtonText: '确定',
					});
					return;
				}
			} else if (this.data_type === 'any') {
				if (isNaN(value)) {
					// 如果是any类型 又转不成数字则变回字符串
					value = this.value;
				}
			}
			let result = await this.$confirm(`确认下发指令${value}?`, '提示', {
				confirmButtonText: '确定',
				cancelButtonText: '取消',
			})
				.then(() => {
					return true;
				})
				.catch(() => {
					return false;
				});
			if (result) {
				this.send_order(value);
			}
		},
	},
};
// 定制iframe组件
let customIframeComponent = {
	template: `
    <iframe :src="url" :style="style(obj)" frameborder="0" scrolling="no"></iframe>
  `,
	mixins: [common_functions, fn],
	data() {
		return {
			url: '', // 固定的跳转地址
		};
	},
	beforeMount() {
		let { placeId, iframeUrl } = this.obj.data;
		if (placeId) {
			this.url = `${iframeUrl}?placeId=${placeId}&token=${this.token}`;
		}
	},
};
// 环境控制组件
let customEnv = {
	template: `
    <div class="env_box row_layout" :style="style(obj)">
      <div class="col_layout" v-for="item in list">
        <div class="icon center">{{item.value || 0}}</div>

        <div class="text">{{item.title}}</div>
      </div>
    </div>
  `,
	mixins: [fn],
	data() {
		return {
			list: [
				{ title: '温度', value: '' },
				{ title: '湿度', value: '' },
				{ title: '光照', value: '' },
				{ title: '二氧化碳', value: '' },
				{ title: '挥发物', value: '' },
				{ title: '甲醛', value: '' },
			],
		};
	},
};
// 窗帘组件
let customCurtain = {
	template: `
  <div class="curtain_box" :style="style(obj)">
    <img class="icon" src="./img/icon28.png">

    <div class="col_layout">
      <div :class="['button','center',select===item.value?'select':'']" v-for="item,index in list"
        @click="custom_order(item.value)">
        {{item.title}}
      </div>
    </div>
  </div>
  `,
	mixins: [common_functions, fn],
	data() {
		return {
			select: '',
			list: [
				{ title: '暂停', value: '550000030368FD' },
				{ title: '全闭', value: '5500000302A93D' },
				{ title: '全开', value: '5500000301E93C' },
			],
		};
	},
	methods: {
		async custom_order(value) {
			this.select = value;
			switch (this.obj.dataConfig.productType) {
				case '1792397648367259648':
					this.request('put', `${sendCmdtoDevice}/8`, this.token, {
						contentType: 0,
						deviceId: this.obj.dataConfig.deviceId,
						attributeMap: {
							protocol_code: 1002,
							ep: 1,
							id: '',
							serial: 2,
							'st.valhex': value,
						},
					});
					break;
				case '1722147067370217472':
					await this.request('put', `${sendCmdtoDevice}/8`, this.token, {
						contentType: 0,
						deviceId: this.obj.dataConfig.deviceId,
						attributeMap: {
							UARTSET: '[2,485,9600,8,1,0]',
						},
					});
					setTimeout(() => {
						this.request('put', `${sendCmdtoDevice}/8`, this.token, {
							contentType: 0,
							deviceId: this.obj.dataConfig.deviceId,
							attributeMap: {
								'CCCMD.Count': 2,
								'CCCMD.Type': '1',
								'CCCMD.Fmat': '0',
								'CCCMD.Cmd': value,
								'CCCMD.Config': '[0,0,0,0]',
							},
						});
					}, 100);
					break;
			}
		},
	},
};
// 智慧电源-全开/关设备
let customPowerOpen = {
	template: `
    <div :style="style(obj)" class="button power_open col_layout" @click="custom_order">
      <img class="bg_img" :src="type()">
      <div :style="cus_style()">{{title}}</div>
    </div>
  `,
	mixins: [common_functions, fn],
	data() {
		return {
			title: this.obj.data.attrs.label.text,
		};
	},
	methods: {
		cus_style() {
			let t = this.obj.data.attrs.label;
			return {
				fontSize: t.fontSize * this.radio + 'px',
				fontWeight: t.fontWeight,
				color: t.fill,
				position: 'relative',
				top: '16%',
			};
		},
		custom_order() {
			this.request('put', `${sendCmdtoDevice}/11`, this.token, {
				contentType: 2,
				deviceId: this.obj.dataConfig.deviceId,
				service: 'Relay_Set_State_Service',
				attributeMap: {
					control_relay: Number(this.obj.dataConfig.channel),
				},
			});
		},
		type() {
			switch (this.obj.data.preset) {
				case '智慧电源-全开设备':
					return './img/icon29.png';
				case '智慧电源-全关设备':
					return './img/icon30.png';
			}
		},
	},
};
// 智慧开关
let customSmartSwitch = {
	template: `
    <div :style="style(obj)" class="smart_switch col_layout">
      <div class="row_layout">
        <div class="text">{{雾化开关?'ON':'OFF'}}</div>
        <div class="icon" @click="custom_order(雾化开关)">
          <img v-show="!雾化开关" src="./img/icon35.png" class="bg_img">
          <img v-show="雾化开关" src="./img/icon34.png" class="bg_img">
        </div>
      </div>
      <div class="flex_grow"></div>
      <div class="text" :style="字体样式">{{title}}</div>
    </div>
  `,
	mixins: [common_functions, fn],
	data() {
		return {
			title: this.obj.data.attrs.label.text,
			value: [], // 因为是动态通道 所以用数组
		};
	},
	created() {
		for (let val of this.obj.dataConfig.channel) {
			this.value.push({
				key: val,
				key2: val.split('.')[1],
				value: 0,
			});
		}
	},
	computed: {
		雾化开关: {
			get() {
				for (let val of this.value) {
					if (val.value) {
						return true;
					}
				}
				return false;
			},
			set(value) {
				for (let val of this.value) {
					val.value = value ? 1 : 0;
				}
			},
		},
		字体样式() {
			let t = this.obj.data.attrs.label;
			return {
				fontSize: t.fontSize * this.radio + 'px',
				fontWeight: t.fontWeight,
				color: t.fill,
			};
		},
	},
	methods: {
		custom_order(value) {
			this.雾化开关 = !value;
			let body = {
				contentType: 0,
				deviceId: this.obj.dataConfig.deviceId,
				attributeMap: {
					ep: 1,
					protocol_code: 1002,
					id: '',
					serial: 1,
				},
			};
			for (let val of this.value) {
				body.attributeMap[val.key] = val.value;
			}
			this.request('put', `${sendCmdtoDevice}/8`, this.token, body);
		},
	},
};
// 扩声组件
let customLoudSound = {
	template: `
    <div class="loud_sound flex_shrink col_layout" :style="style(obj)">
      <div class="text">扩声系统</div>

      <img v-show="value[0]" class="icon flex_grow" src="./img/icon31.png">
      <img v-show="!value[0]" class="icon flex_grow" src="./img/icon32.png">

      <div class="button center" @click="custom_order">
        <img class="bg_img" src="./img/icon33.png">
        <div>{{value[0]?'取消静音':'一键静音'}}</div>
      </div>
    </div>
  `,
	mixins: [common_functions, fn],
	data() {
		return {
			value: [0, 0, 0, 0, 0, 0, 0, 0],
		};
	},
	methods: {
		custom_order() {
			if (this.value[0]) {
				this.value = [0, 0, 0, 0, 0, 0, 0, 0];
			} else {
				this.value = [1, 1, 1, 1, 1, 1, 1, 1];
			}
			this.request('put', `${sendCmdtoDevice}/8`, this.token, {
				contentType: 0,
				deviceId: this.obj.dataConfig.deviceId,
				attributeMap: {
					OUTMS: this.value,
				},
			});
		},
	},
};
// 灯光组件
let customLight = {
	template: `
    <div class="light_box col_layout" :style="style(obj)">
      <div class="row_layout row1">
        <div class="text">{{my_switch?'ON':'OFF'}}</div>

        <div class="icon" @click="custom_order('开关',my_switch)">
          <img v-show="my_switch" class="bg_img" src="./img/icon34.png">
          <img v-show="!my_switch" class="bg_img" src="./img/icon35.png">
        </div>
      </div>

      <img class="icon" src="./img/icon36.png">

      <div class="row_layout row2">
        <img class="icon" src="./img/icon37.png">

        <el-slider class="slider" v-model="value" @change="custom_order('值',value)"></el-slider>

        <img class="icon" src="./img/icon38.png">
      </div>
    </div>
  `,
	mixins: [common_functions, fn],
	data() {
		return {
			on_off: [],
			value: 0,
		};
	},
	created() {
		for (let val of this.obj.dataConfig.switchConfig) {
			this.on_off.push({
				device_id: val.deviceId,
				channel: val.channel.map((e) => ({
					key: e,
					key2: e.split('.')[1],
					value: 0,
				})),
			});
		}
	},
	computed: {
		my_switch: {
			get() {
				for (let val of this.on_off) {
					for (let val2 of val.channel) {
						if (val2.value) {
							return true;
						}
					}
				}
				return false;
			},
			set(value) {
				for (let val of this.on_off) {
					for (let val2 of val.channel) {
						val2.value = value ? 1 : 0;
					}
				}
			},
		},
	},
	methods: {
		custom_order(tag, value) {
			switch (tag) {
				case '开关':
					this.my_switch = !value;
					for (let val of this.on_off) {
						this.light_switch(0, val.channel, val.device_id);
					}
					break;
				case '值':
					for (let val of this.obj.dataConfig.lightConfig) {
						this.request('put', `${sendCmdtoDevice}/8`, this.token, {
							contentType: 0,
							deviceId: val.deviceId,
							attributeMap: {
								ep: 1,
								'st.bri': value,
								protocol_code: 1002,
								id: '',
								serial: 1,
							},
						});
					}
					break;
			}
		},
		// 递归下发指令
		light_switch(index, list, device_id) {
			let t = {
				contentType: 0,
				deviceId: device_id,
				attributeMap: {
					ep: 1,
					protocol_code: 1002,
					id: '',
					serial: 1,
					[list[index].key]: list[index].value,
				},
			};
			this.request('put', `${sendCmdtoDevice}/8`, this.token, t, () => {
				index++;
				if (index < list.length) {
					setTimeout(() => {
						this.light_switch(index, list, device_id);
					}, 500);
				}
			});
		},
	},
};
// LCD大屏
let customLcd = {
	template: `
    <div class="lcd_box" :style="style(obj)">
      <img class="icon" src="./img/icon39.png">

      <div class="col_layout">
        <template v-for="item in titles">
          <div class="text">{{item.label}}</div>

          <img class="icon" @click="custom_order(item)" v-show="item.status" src="img/icon34.png">
          <img class="icon" @click="custom_order(item)" v-show="!item.status" src="img/icon35.png">
        </template>
      </div>
    </div>
  `,
	mixins: [common_functions, fn],
	data() {
		return {
			titles: [
				{ label: 'LCD电源', status: false },
				{ label: 'LCD背光', status: false },
			],
		};
	},
	methods: {
		async custom_order(ele) {
			ele.status = !ele.status;
			let t;
			switch (ele.label) {
				case 'LCD电源':
					if (ele.status) {
						t = '55AA004DFE0000000000010010000005010000B756';
					} else {
						t = '55AA004FFE0000000000010010000005010001BA56';
					}
					break;
				case 'LCD背光':
					if (ele.status) {
						t = '55AA0041FE0000000000010011000005010000AC56';
					} else {
						t = '55AA0043FE0000000000010011000005010001AF56';
					}
					break;
			}
			await this.request('put', `${sendCmdtoDevice}/8`, this.token, {
				contentType: 0,
				deviceId: this.obj.dataConfig.deviceId,
				attributeMap: {
					UARTSET: '[1,232,115200,8,1,0]',
				},
			});
			setTimeout(() => {
				this.request('put', `${sendCmdtoDevice}/8`, this.token, {
					contentType: 0,
					deviceId: this.obj.dataConfig.deviceId,
					attributeMap: {
						'CCCMD.Count': 1,
						'CCCMD.Type': '0',
						'CCCMD.Fmat': '0',
						'CCCMD.Cmd': t,
						'CCCMD.Config': '[0,0,0,0]',
					},
				});
			}, 100);
		},
	},
};
// 会议模式
let customMeetingMode = {
	template: `
    <div class="button meeting_mode col_layout" @click="custom_order"
     :style="style(obj)">
      <img class="icon" :src="url">
      <div :style="title_style">{{title}}</div>
    </div>
  `,
	mixins: [common_functions, fn],
	data() {
		return {
			title: this.obj.data.attrs.label.text,
		};
	},
	computed: {
		url() {
			switch (this.obj.data.preset) {
				case '会议模式-样式一':
					return './img/icon40.png';
				case '会议模式-样式二':
					return './img/icon41.png';
				case '会议模式-样式三':
					return './img/icon42.png';
				case '会议模式-样式四':
					return './img/icon43.png';
			}
		},
		title_style() {
			let t = this.obj.data.attrs.label;
			return {
				fontSize: t.fontSize * this.radio + 'px',
				fontWeight: t.fontWeight,
				color: t.fill,
			};
		},
	},
	methods: {
		custom_order() {
			this.send(0, this.obj.dataConfig.products);
		},
		async send(index, list) {
			// 根绝产品类型区分下发指令格式
			let t1 = list[index];
			switch (t1.productName) {
				case '智慧电源':
					for (let val of t1.config) {
						this.request('put', `${sendCmdtoDevice}/11`, this.token, {
							contentType: 2,
							deviceId: val.deviceId,
							service: 'Relay_Set_State_Service',
							attributeMap: {
								control_relay: Number(val.channel),
							},
						});
					}
					break;
				case '运算中心':
					try {
						for (let val of t1.config) {
							let d = JSON.parse(val.customDirectives);
							if (typeof d !== 'object') {
								throw '运算中心配置JSON错误';
							}
							this.request('put', `${sendCmdtoDevice}/8`, this.token, {
								contentType: 0,
								deviceId: val.deviceId,
								attributeMap: d,
							});
						}
					} catch (error) {
						this.$message.error(error);
					}
					break;
				case '灯光':
					// 开关
					for (let val of t1.config.switchConfig) {
						let t2 = val.channel.map((e) => ({
							key: e,
							value: Number(val.customValue) || 0,
						}));
						this.light_switch(0, t2, val.deviceId);
					}
					// 值
					for (let val of t1.config.lightConfig) {
						this.request('put', `${sendCmdtoDevice}/8`, this.token, {
							contentType: 0,
							deviceId: val.deviceId,
							attributeMap: {
								ep: 1,
								'st.bri': Number(val.customValue) || 0,
								protocol_code: 1002,
								id: '',
								serial: 1,
							},
						});
					}
					break;
				case '智慧开关':
					for (let val of t1.config) {
						let body = {
							contentType: 0,
							deviceId: val.deviceId,
							attributeMap: {
								ep: 1,
								protocol_code: 1002,
								id: '',
								serial: 1,
							},
						};
						for (let val2 of val.channel) {
							body.attributeMap[val2] = Number(val.customValue);
						}
						this.request('put', `${sendCmdtoDevice}/8`, this.token, body);
					}
					break;
				case '窗帘':
					for (let val of t1.config) {
						switch (val.productType) {
							case '1792397648367259648':
								this.request('put', `${sendCmdtoDevice}/8`, this.token, {
									contentType: 0,
									deviceId: val.deviceId,
									attributeMap: {
										protocol_code: 1002,
										ep: 1,
										id: '',
										serial: 2,
										'st.valhex': val.customValue,
									},
								});
								break;
							case '1722147067370217472':
								await this.request('put', `${sendCmdtoDevice}/8`, this.token, {
									contentType: 0,
									deviceId: val.deviceId,
									attributeMap: {
										UARTSET: '[2,485,9600,8,1,0]',
									},
								});
								setTimeout(() => {
									this.request('put', `${sendCmdtoDevice}/8`, this.token, {
										contentType: 0,
										deviceId: val.deviceId,
										attributeMap: {
											'CCCMD.Count': 2,
											'CCCMD.Type': '1',
											'CCCMD.Fmat': '0',
											'CCCMD.Cmd': val.customValue,
											'CCCMD.Config': '[0,0,0,0]',
										},
									});
								}, 100);
								break;
						}
					}
					break;
				case '空调':
					break;
			}
			if (list[++index]) {
				setTimeout(() => {
					this.send(index, list);
				}, 500);
			}
		},
		light_switch(index, list, device_id) {
			this.request(
				'put',
				`${sendCmdtoDevice}/8`,
				this.token,
				{
					contentType: 0,
					deviceId: device_id,
					attributeMap: {
						ep: 1,
						protocol_code: 1002,
						id: '',
						serial: 1,
						[list[index].key]: list[index].value,
					},
				},
				() => {
					index++;
					if (list[index]) {
						setTimeout(() => {
							this.light_switch(index, list, device_id);
						}, 500);
					}
				}
			);
		},
	},
};
// 智慧运算中心IN
let customSliderInout = {
	template: `
    <div class="slider_in_out" :style="style(obj)">
      <div class="slider" v-for="item,index in channel">
        <div class="text1 center flex_shrink">{{item.label}}</div>
        <div class="line1 flex_shrink"></div>
        <div class="line2 flex_shrink"></div>
        <div class="button button1 center flex_shrink" @click="custom_order('静音',item)">
          <img v-show="item.mute==0" src="./img/icon44.png" class="bg_img">
          <img v-show="item.mute==1" src="./img/icon45.png" class="bg_img">
          静音
        </div>
        <div class="text2 center text_ellipsis flex_shrink">
          {{item.gain}} dB
        </div>
        <div class="slider_box_bottom flex_shrink">
          <div class="level_box flex_shrink">
            <span class="text center">{{level_max}}</span>
            <div class="level">
              <img src="./img/icon46.png" class="bg_img">
              <div class="cover" :style="level(item.level)"></div>
            </div>
            <span class="text center">{{level_min}}</span>
          </div>
          <div class="gain_box flex_shrink">
            <span class="text center">{{gain_max}}</span>
            <div class="gain_body flex_shrink">
              <img src="./img/icon47.png" class="bg_img">
              <el-slider class="icon2" v-model="item.gain" @change="custom_order('增益',$event)" vertical :show-tooltip="false"
                :min="gain_min" :max="gain_max" :step="step">
              </el-slider>
            </div>
            <span class="text center">{{gain_min}}</span>
          </div>
        </div>
      </div>
    </div>
  `,
	mixins: [common_functions, fn],
	data() {
		return {
			channel: [], // 通道
			level_max: 0,
			level_min: -72,
			gain_max: 12,
			gain_min: -72,
			step: 0.1,
		};
	},
	created() {
		this.channel = this.obj.dataConfig.channel.map((e) => ({
			gain: 0,
			level: 0,
			mute: 0,
			label: e.value,
		}));
	},
	methods: {
		// 电平样式
		level(level) {
			let p = (level - this.level_min) / (this.level_max - this.level_min);
			return { height: `${p * 100}%` };
		},
		custom_order(tag, params) {
			// 区分是IN OUT
			let type = this.obj.shapeNickname == '智慧运算中心-IN' ? true : false;
			switch (tag) {
				case '静音':
					params.mute = params.mute ? 0 : 1;
					this.request('put', `${sendCmdtoDevice}/8`, this.token, {
						contentType: 0,
						deviceId: this.obj.dataConfig.deviceId,
						attributeMap: {
							[type ? 'INMS' : 'OUTMS']: this.channel.map((e) => e.mute),
						},
					});
					break;
				case '增益':
					this.request('put', `${sendCmdtoDevice}/8`, this.token, {
						contentType: 0,
						deviceId: this.obj.dataConfig.deviceId,
						attributeMap: {
							[type ? 'INGS' : 'OUTGS']: this.channel.map((e) => e.gain * 100),
						},
					});
					break;
			}
		},
	},
};
// 当前会议
let customCurrentMeeting = {
	template: `
    <div class="cur_meeting" :style="style(obj)">
      <img v-if="obj.data.backgroundImg" :src="obj.data.backgroundImg" class="bg_img">

      <div class="col_layout">
        <span class="text1" :style="字体样式('当前会议')">{{当前会议}}</span>

        <div class="row_layout">
          <img src="./img/icon18.png" class="icon1">

          <span class="text2" :style="字体样式('会议地点')">{{会议地点}}</span>
        </div>
      </div>

    <div class="row_layout text_ellipsis">{{下场会议}}</div>
  </div>
  `,
	mixins: [fn, common_functions],
	data() {
		return {
			当前会议: '暂无进行中的会议',
			会议地点: '',
			下场会议: '无',
		};
	},
	created() {
		this.查询会议室名称();
		this.查询会议();
		setInterval(() => {
			this.查询会议();
		}, 10 * 60 * 1000);
	},
	methods: {
		字体样式(type) {
			switch (type) {
				case '当前会议':
					return { fontSize: `${36 * this.radio}px` };
				case '会议地点':
					return { fontSize: `${20 * this.radio}px` };
			}
		},
		查询会议室名称() {
			if (this.obj.dataConfig.placeId) {
				this.request('get', `${我是接口地址}/api-portal/room/search/${this.obj.dataConfig.placeId}`, this.token, ({ data: res }) => {
					if (res.head.code === 200) {
						this.会议地点 = res.data.roomName;
					}
				});
			}
		},
		查询会议() {
			if (this.obj.dataConfig.placeId) {
				this.request('get', `${我是接口地址}/api-portal/room/currentAndNextMeeting/${this.obj.dataConfig.placeId}`, this.token, ({ data: res }) => {
					if (res.head && res.head.code == 200) {
						this.下场会议 = res.data[1] ? res.data[1].theme : '无';
						this.当前会议 = res.data[0] ? res.data[0].theme : '暂无进行中的会议';
					}
				});
			}
		},
	},
};
// 会议结束时间
let customMeetingEndTime = {
	template: `
  <div class="count_down col_layout" :style="style(obj)">
    <div class="text1 row_layout flex_shrink" :style="字体样式('日期')">{{日期}}</div>

    <div class="time_box flex_shrink">
      <img class="bg_img" src="./img/icon19.png">

      <div class="time col_layout">
        <span class="text3" :style="字体样式('结束时间')">结束时间</span>

        <div class="text2 text3" :style="字体样式('时间数字')">{{结束时间}}</div>
      </div>
    </div>
  </div>
  `,
	mixins: [fn, common_functions],
	data() {
		return {
			日期: '',
			结束时间: '',
		};
	},
	created() {
		this.查询会议();
		setInterval(() => {
			this.查询会议();
		}, 10 * 60 * 1000);
	},
	methods: {
		查询会议() {
			let d2 = new Date();
			let 星期 = this.获取星期(d2);
			this.日期 = `${d2.getFullYear()}年${d2.getMonth() + 1}月${d2.getDate()}日 ${星期}`;
			if (this.obj.dataConfig.placeId) {
				this.request('get', `${我是接口地址}/api-portal/room/currentAndNextMeeting/${this.obj.dataConfig.placeId}`, this.token, ({ data: res }) => {
					if (res.head && res.head.code == 200) {
						let t = res.data[0].endTime;
						// let date = new Date(t.replace(/-/g, '/'));
						// let 星期 = this.获取星期(date);
						// let arr = t.split(' ')[0].split('-');
						// this.日期 = `${arr[0]}年${arr[1]}月${arr[2]}日 ${星期}`;
						this.结束时间 = t.split(' ')[1].substring(0, 5);
					}
				});
			}
		},
		获取星期(date) {
			switch (date.getDay()) {
				case 0:
					return '周日';
				case 1:
					return '周一';
				case 2:
					return '周二';
				case 3:
					return '周三';
				case 4:
					return '周四';
				case 5:
					return '周五';
				case 6:
					return '周六';
			}
		},
		字体样式(type) {
			switch (type) {
				case '结束时间':
					return {
						fontSize: `${20 * this.radio}px`,
						marginBottom: `${20 * this.radio}px`,
					};
				case '时间数字':
					return { fontSize: `${30 * this.radio}px` };
				case '日期':
					return { fontSize: `${20 * this.radio}px` };
			}
		},
	},
};
// 场景按钮
let customScene = {
	template: `
    <div class="button center" :style="style(obj)" @click="执行场景()">
      <img src="./img/icon49.png" class="bg_img">
      <div :style="cus_style()">{{title}}</div>
    </div>
  `,
	mixins: [common_functions, fn],
	data() {
		return {
			title: this.obj.data.attrs.label.text || '',
		};
	},
	methods: {
		cus_style() {
			let t = this.obj.data.attrs.label;
			return {
				fontSize: t.fontSize * this.radio + 'px',
				fontWeight: t.fontWeight,
				color: t.fill,
				position: 'relative',
			};
		},
		async 执行场景() {
			if (this.obj.dataConfig.sceneId) {
				let {
					data: {
						head: { code },
					},
				} = await this.request('post', `${执行场景规则}/${this.obj.dataConfig.sceneId}`, this.token);
				this.$message[`${code == 200 ? 'success' : 'error'}`](`场景执行${code == 200 ? '成功' : '失败'}`);
			}
		},
	},
};
