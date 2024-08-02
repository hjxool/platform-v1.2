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
				// 有设置属性值则下发
				if (typeof value != 'undefined' && val.attrPath) {
					body.attributeMap = {
						[val.attrPath]: value,
					};
					// for (let val of this.path_list) {
					// 	body.attributeMap[val.path_str] = value;
					// }
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
				if (this.obj.bindDeviceId?.targetDevice || this.obj.bindDeviceId?.sourceDevice) {
					// 判断当前设备上报消息 与当前连线组件是否相关
					// 断连条件 有一个设备离线就断开 在线条件 两个设备都在线
					switch (newvalue.device_id) {
						case this.obj.bindDeviceId.targetDevice:
							// 相关则判断设备在线状态 4离线 5在线
							if (newvalue.device_status === 6 && this.target_status) {
								this.target_status = false;
							} else if (newvalue.device_status === 5 && !this.target_status) {
								this.target_status = true;
							}
							break;
						case this.obj.bindDeviceId.sourceDevice:
							if (newvalue.device_status === 6 && this.source_status) {
								this.source_status = false;
							} else if (newvalue.device_status === 5 && !this.source_status) {
								this.source_status = true;
							}
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
					switch (newvalue.device_status) {
						case 5:
							this.is_normal = true;
							break;
						case 6:
							this.is_normal = false;
							break;
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
			this.obj.url ? this.$bus.$emit('turn_to_page', this.obj.url) : '';
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
    <div :style="style(obj)">
      <img class="bg_img" :src="obj.imageUrl">
    </div>
  `,
	mixins: [common_functions, fn],
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
    <svg :style="cus_style(obj,page)">
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
	props: ['page', 'mouse_p'],
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
		cus_style(obj, page) {
			return {
				position: 'absolute',
				// zIndex: obj.z_index,
				zIndex: -10,
				left: 0,
				top: 0,
				width: '100%',
				height: `${page.mb.h * page.radio}px`,
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
    <div class="device_name">{{obj.nickName}}</div>
  </div>
`,
	props: ['page_width'],
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
					window.open(`../index.html?type=${res.data.productUrl}&token=${this.token}&id=${res.data.id}&device_name=${name}`);
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
			let parent_left = this.obj.x + this.obj.w;
			if (w + parent_left > this.page_width) {
				left = `${(this.obj.x - w) * this.radio}px`;
			} else {
				left = `${parent_left * this.radio}px`;
			}
			this.$bus.$emit('device_status', {
				list: this.status,
				show,
				style: {
					width: `${w * this.radio}px`,
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
};
// 按钮
let customButton = {
	template: `
    <div :style="style(obj)" class="center button_box" @click="distinguish_operation">
      <img src="./img/icon1.png" class="bg_img">
      <span :style="size(obj)">{{text}}</span>
    </div>
  `,
	mixins: [common_functions, fn],
	data() {
		return {
			text: this.obj.dataConfig?.buttonLabel || '',
		};
	},
	methods: {
		size(obj_data) {
			let t = (203 / 22) * 16; //计算多少容器大小下 字体是16px
			let fz = (obj_data.w * this.radio) / t;
			return {
				color: '#fff',
				fontSize: fz + 'rem',
				zIndex: 1,
			};
		},
		// 按钮分下发指令和切换页面两种
		distinguish_operation() {
			this.send_order(undefined);
		},
	},
};
// 一键巡检
let customOnlineCheck = {
	template: `
    <div :style="style(obj)" class="center button" @click="check_devices">
      <img src="./img/icon1.png" class="bg_img">
      <span :style="size(obj)">{{text}}</span>
    </div>
  `,
	mixins: [common_functions, fn],
	props: ['is_checking', 'random_num'],
	data() {
		return {
			text: this.obj.dataConfig?.buttonLabel || '',
		};
	},
	methods: {
		size(obj_data) {
			let t = (203 / 22) * 16; //计算多少容器大小下 字体是16px
			let fz = (obj_data.w * this.radio) / t;
			return {
				color: '#fff',
				fontSize: fz + 'rem',
				zIndex: 1,
			};
		},
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
			let list = [];
			// 从按钮绑定的behaviorList列表中取出绑定了服务的设备
			for (let val of this.obj.behaviorList) {
				let t = {
					deviceId: val.deviceId,
					// placeId: this.obj.dataConfig.placeId,
					serviceIdentifier: val.serviceIdentifier,
				};
				list.push(t);
			}
			// 先打开弹窗等请求回来再加载数据
			this.$bus.$emit('online_check', { type: 'open', data: [] });
			// 取得每个请求关联的消息id
			let { data: res } = await this.request('post', `${online_check_url}/${this.random_num}`, this.token, list).catch((err) => false);
			if (res?.head.code !== 200) {
				return;
			}
			// 存储消息id列表 等到推流消息时查看是否有对应id
			this.check_list = [];
			for (let val of res.data) {
				let t = {
					message_id: val.messageId,
					device_name: val.deviceName,
					device_id: val.deviceId,
					service_identifier: val.serviceIdentifier,
					result: '巡检中',
				};
				// 获取服务名称
				for (let val2 of this.obj.behaviorList) {
					if (val2.deviceId == t.device_id && val2.serviceIdentifier == t.service_identifier) {
						t.service_name = val2.serviceName;
						break;
					}
				}
				this.check_list.push(t);
			}
			// 发送消息 打开弹窗
			this.$bus.$emit('online_check', { type: 'open', data: this.check_list });
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
    <div :style="style(obj)" @click="show_matrix">
      <img class="bg_img" src="./img/icon25.png">
    </div>
  `,
	mixins: [common_functions, fn],
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
    <div :style="style(obj)" @click="show_matrix">
      <img class="bg_img" src="./img/icon22.png">
    </div>
  `,
	mixins: [common_functions, fn],
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
			let body = {
				contentType: 0,
				deviceId: this.device_id,
				attributeMap: {
					VSWT: value,
				},
			};
			this.list.splice(Math.floor(index / 4), 1, index % 4);
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
// // 定制iframe组件
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

// // 下拉框
// let customSelector = {
// 	template: `
//     <div class="select_box" :style="style(obj)" @click.stop="popup">
//       <img src="./img/icon8.png" class="bg_img">
//       <span class="text_ellipsis" :style="font_size(obj)" :title="label">{{label}}</span>
//     </div>
//   `,
// 	mixins: [common_functions, fn],
// 	props: ['group'],
// 	data() {
// 		return {
// 			label: '',
// 			value: '',
// 		};
// 	},
// 	beforeMount() {
// 		this.$bus.$on('selector', (...params) => {
// 			if (params[0] == this.group) {
// 				this.label = params[1].label;
// 				this.value = params[1].value;
// 			}
// 		});
// 	},
// 	methods: {
// 		// 字体样式
// 		font_size(obj_data) {
// 			let t = (203 / 16) * 16; //计算多少容器大小下 字体是16px
// 			let fz = (obj_data.w * this.radio) / t;
// 			// 计算字体大小(px) 如果超过组件高度 则字体大小设为组件高度 小于组件高度则正常显示
// 			let fpx = ((obj_data.w * this.radio) / 203) * 16;
// 			if (fpx >= obj_data.h - 8) {
// 				// 上下各留4px间距 默认根节点字体大小16px
// 				fz = (obj_data.h - 8) / 16;
// 			}
// 			return {
// 				color: '#fff',
// 				fontSize: fz + 'rem',
// 				paddingRight: obj_data.w * this.radio * 0.152 + 'px',
// 				paddingLeft: obj_data.w * this.radio * 0.076 + 'px',
// 			};
// 		},
// 		// 显示弹窗
// 		popup() {
// 			this.$bus.$emit('display_popup', this.group, true);
// 			this.$bus.$emit('current_group', this.group);
// 		},
// 	},
// 	computed: {
// 		options() {
// 			let arr = [];
// 			if (this.data_type === 'int' || this.data_type === 'float' || this.data_type === 'double') {
// 				for (let val of this.obj.option) {
// 					let t = { label: val.label };
// 					// 选项中可能有字符
// 					t.value = isNaN(Number(val.value)) ? 0 : Number(val.value);
// 					arr.push(t);
// 				}
// 			} else if (this.data_type === 'any') {
// 				for (let val of this.obj.option) {
// 					let t = { label: val.label };
// 					t.value = isNaN(Number(val.value)) ? val.value : Number(val.value);
// 					arr.push(t);
// 				}
// 			}
// 			return arr;
// 		},
// 	},
// 	watch: {
// 		value(newvalue, oldvalue) {
// 			if (isNaN(newvalue)) {
// 				return;
// 			}
// 			for (let val of this.options) {
// 				if (val.value == newvalue) {
// 					this.label = val.label;
// 					break;
// 				}
// 			}
// 		},
// 	},
// };
// let customPopup = {
// 	template: `
//     <el-card v-show="display" :style="position(obj)" :body-style="{overflow:'auto',maxHeight:'500px'}" shadow="never">
//       <div class="popup_text" :style="size(obj)" v-for="item,index in options" :key="index" @click="select(item)">{{item.label}}</div>
//     </el-card>
//   `,
// 	mixins: [common_functions, fn],
// 	props: ['group'],
// 	beforeMount() {
// 		this.$bus.$on('display_popup', (index, show) => {
// 			if (index == this.group) {
// 				this.display = show;
// 			}
// 		});
// 	},
// 	data() {
// 		return {
// 			display: false,
// 		};
// 	},
// 	methods: {
// 		// 弹窗定位
// 		position(obj_data) {
// 			// 当弹窗显示不下在反方向显示
// 			let t = (obj_data.y + obj_data.h) * this.radio + 14;
// 			let t2 = obj_data.x * this.radio;
// 			return {
// 				position: 'absolute',
// 				zIndex: '990',
// 				left: t2 + 'px',
// 				top: t + 'px',
// 			};
// 		},
// 		// 选择值
// 		select(obj) {
// 			this.$bus.$emit('selector', this.group, obj);
// 			this.send_order(obj.value);
// 		},
// 		// 字体大小 控制弹窗缩放
// 		size(obj) {
// 			let t = (203 / 22) * 16; //计算多少容器大小下 字体是16px
// 			let fz = (obj.w * this.radio) / t;
// 			if (fz > 1) {
// 				fz = 1;
// 			}
// 			return {
// 				fontSize: fz + 'rem',
// 			};
// 		},
// 	},
// 	computed: {
// 		options() {
// 			let arr = [];
// 			if (this.data_type === 'int' || this.data_type === 'float' || this.data_type === 'double') {
// 				for (let val of this.obj.option) {
// 					let t = { label: val.label };
// 					// 选项中可能有字符
// 					t.value = isNaN(Number(val.value)) ? 0 : Number(val.value);
// 					arr.push(t);
// 				}
// 			} else if (this.data_type === 'any') {
// 				for (let val of this.obj.option) {
// 					let t = { label: val.label };
// 					t.value = isNaN(Number(val.value)) ? val.value : Number(val.value);
// 					arr.push(t);
// 				}
// 			}
// 			return arr;
// 		},
// 	},
// };
// // 矩阵
// let customMatrix = {
// 	template: `
//   <div class="matrix" :style="matrix_style(obj)">
//     <div class="matrix" v-for="row in obj.nh" :style="row_style(obj)">
//       <div class="center button" v-for="col in obj.mw" @click="control(row-1,col-1)">
//         <img v-show="value[row-1][col-1]" src="./img/icon9.png" class="bg_img">
//         <img v-show="!value[row-1][col-1]" src="./img/icon10.png" class="bg_img">
//       </div>
//     </div>
//   </div>
//   `,
// 	mixins: [common_functions, fn],
// 	data() {
// 		return {
// 			value: this.init(),
// 		};
// 	},
// 	methods: {
// 		matrix_style(obj_data) {
// 			return {
// 				position: 'absolute',
// 				width: obj_data.w * this.radio + 'px',
// 				height: obj_data.h * this.radio + 'px',
// 				top: obj_data.y * this.radio + 'px',
// 				left: obj_data.x * this.radio + 'px',
// 				zIndex: obj_data.z_index,
// 				gridTemplateRows: `repeat(${obj_data.nh}, 1fr)`,
// 			};
// 		},
// 		row_style(obj_data) {
// 			return {
// 				gridTemplateColumns: `repeat(${obj_data.mw}, 1fr)`,
// 			};
// 		},
// 		control(row, col) {
// 			this.value[row].splice(col, 1, this.value[row][col] ? 0 : 1);
// 			let str = '';
// 			for (let val of this.value) {
// 				str += val.join('');
// 			}
// 			this.send_order(str);
// 		},
// 		init() {
// 			let t = [];
// 			for (let index = 0; index < this.obj.nh; index++) {
// 				let t2 = [];
// 				for (let index2 = 0; index2 < this.obj.mw; index2++) {
// 					t2.push(0);
// 				}
// 				t.push(t2);
// 			}
// 			return t;
// 		},
// 	},
// };
// // 单选框组
// let customRadioGroup = {
// 	template: `
//     <el-radio-group class="radio_group" :style="style(obj)" v-model="value" @change="send_order(value)">
//       <el-radio v-for="item,index in options" :key="index" :label="item.value">{{item.label}}</el-radio>
//     </el-radio-group>
//   `,
// 	mixins: [common_functions, fn],
// 	data() {
// 		return {
// 			value: '',
// 		};
// 	},
// 	computed: {
// 		options() {
// 			let arr = [];
// 			if (this.data_type === 'int' || this.data_type === 'float' || this.data_type === 'double') {
// 				for (let val of this.obj.option) {
// 					let t = { label: val.label };
// 					// 选项中可能有字符
// 					t.value = isNaN(Number(val.value)) ? 0 : Number(val.value);
// 					arr.push(t);
// 				}
// 			} else if (this.data_type === 'any') {
// 				for (let val of this.obj.option) {
// 					let t = { label: val.label };
// 					t.value = isNaN(Number(val.value)) ? val.value : Number(val.value);
// 					arr.push(t);
// 				}
// 			}
// 			return arr;
// 		},
// 	},
// };
// // 多选框
// let customCheckBox = {
// 	template: `
//     <el-checkbox-group class="check_box" :style="style(obj)" v-model="value" @change="send_order(value)">
//       <el-checkbox v-for="item,index in options" :key="index" :label="item.value">{{item.label}}</el-checkbox>
//     </el-checkbox-group>
//   `,
// 	mixins: [common_functions, fn],
// 	data() {
// 		return {
// 			value: [],
// 		};
// 	},
// 	computed: {
// 		options() {
// 			let arr = [];
// 			if (this.data_type === 'int' || this.data_type === 'float' || this.data_type === 'double') {
// 				for (let val of this.obj.option) {
// 					let t = { label: val.label };
// 					// 选项中可能有字符
// 					t.value = isNaN(Number(val.value)) ? 0 : Number(val.value);
// 					arr.push(t);
// 				}
// 			} else if (this.data_type === 'any') {
// 				for (let val of this.obj.option) {
// 					let t = { label: val.label };
// 					t.value = isNaN(Number(val.value)) ? val.value : Number(val.value);
// 					arr.push(t);
// 				}
// 			}
// 			return arr;
// 		},
// 	},
// };
// // 表格及控制按钮
// let customTable = {
// 	template: `
//     <el-table :data="value" :style="table_style(obj)" :max-height="maxheight">
//       <el-table-column v-for="item in obj.option" :prop="item.value" :label="item.label"></el-table-column>
//       <el-table-column label="操作">
//         <template slot-scope="scope">
//           <el-button v-for="button in obj.button" @click="table_button_order(button)" size="mini">{{button.label}}</el-button>
//         </template>
//       </el-table-column>
//     </el-table>
//   `,
// 	mixins: [common_functions, fn],
// 	data() {
// 		return {
// 			value: [],
// 		};
// 	},
// 	methods: {
// 		// 表格样式
// 		table_style(obj) {
// 			return {
// 				position: 'absolute',
// 				width: obj.w * this.radio + 'px',
// 				top: obj.y * this.radio + 'px',
// 				left: obj.x * this.radio + 'px',
// 				zIndex: obj.z_index,
// 			};
// 		},
// 		// 表格下发指令
// 		table_button_order(button) {
// 			let body = {
// 				contentType: 0,
// 				deviceId: this.obj.deviceId,
// 			};
// 			// 有服务则下发
// 			if (button.service) {
// 				body.contentType = 2;
// 				body.service = button.service;
// 			}
// 			// 有设置属性值则下发
// 			let t = JSON.parse(JSON.stringify(this.custom)); // 拷贝一份不修改原值
// 			if (button.value) {
// 				let p = button.attribute[button.attribute.length - 1];
// 				let path = p?.path || p;
// 				t[path] = button.value;
// 			}
// 			body.attributeMap = t;
// 			// 有topic才能下发指令
// 			if (button.topic) {
// 				this.request('put', `${sendCmdtoDevice}/${button.topic}`, this.token, body);
// 			}
// 		},
// 	},
// 	computed: {
// 		maxheight() {
// 			return this.obj.h * this.radio;
// 		},
// 	},
// };
