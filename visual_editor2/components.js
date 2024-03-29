// 通用方法及变量
const fn = {
	props: ['obj', 'radio'],
	beforeMount() {
		// 此处监听数据变化 根据路径判断是否赋值
		this.$bus.$on('get_value', (res) => {
			// 不同组件判断条件不同
			if (this.obj.type === '连线') {
				// 只有 连线两端都是设备节点才显示状态
				if (!this.obj.bindDeviceId?.targetDevice || !this.obj.bindDeviceId?.sourceDevice) {
					return;
				}
				// 判断当前设备上报消息 与当前连线组件是否相关
				// 断连条件 有一个设备离线就断开 在线条件 两个设备都在线
				switch (res.device_id) {
					case this.obj.bindDeviceId.targetDevice:
						// 相关则判断设备在线状态 4离线 5在线
						if (res.device_status === 4 && this.target_status) {
							this.target_status = false;
						} else if (res.device_status === 5 && !this.target_status) {
							this.target_status = true;
						}
						break;
					case this.obj.bindDeviceId.sourceDevice:
						if (res.device_status === 4 && this.source_status) {
							this.source_status = false;
						} else if (res.device_status === 5 && !this.source_status) {
							this.source_status = true;
						}
						break;
				}
			} else if (this.obj.shapeNickname == '设备节点') {
				// 本质是多属性回显 以往组件是单属性回显
				if (this.obj.dataConfig.deviceId === res.device_id) {
					// 设备状态
					this.is_normal = res.device_status === 5;
					// 只要设备id匹配 把原先的单属性解析改为遍历取出每个属性解析并并存到数组下而不是this.value
					for (let val of this.status) {
						// analysis_path原先没设计有多属性回显 因此用的全局变量 这里设置全局变量 用完后置空
						// this.data_type = val.type;
						val.value = this.analysis_path(val.path, 0, res.data);
						// this.data_type = null;
					}
				}
			} else {
				// 有回显数据时 传入的是一个原始结构对象 根据path属性解析路径取任意层级的值
				// 此时是在组件挂载完毕时接收到的数据 path已经有了
				if (this.path_list?.length !== 1 || this.obj.deviceId !== res.device_id) {
					// path_list未就绪或者未绑定属性
					// path_list绑定多个属性也不回显
					// 组件关联设备id不匹配
					return;
				}
				// 到这一步说明当前数据与当前组件相关 进行进一步路径解析
				// 每一条数据 只跟一个设备相关
				// 虽然可以绑定多个属性 但是回显会冲突 因此只取一个属性值作为代表
				let index = 0;
				this.analysis_path(this.path_list[0].path, index, res.data);
			}
		});
		this.$bus.$on('common_params', (...val) => {
			this.token = val[0];
		});
	},
	mounted() {
		this.path_list = []; //记录路径列表
		if (this.obj.attr?.length) {
			// 有多个路径就有多个类型
			for (let val of this.obj.attr) {
				let t = {
					path_str: val.path,
					path: this.init_path(val.path), //解析后的数组路径用于匹配回显
					type: val.type,
				};
				this.path_list.push(t);
			}
			this.data_type = this.path_list[0].type; // 记录回显属性类型
		}
	},
	methods: {
		send_order(value) {
			if (typeof value !== 'undefined' && !this.path_list.length) {
				// 值不为空 且 未绑定属性
				return;
			}
			let body = {
				contentType: 0,
				deviceId: this.obj.deviceId,
			};
			// 有服务则下发
			if (this.obj.service?.length) {
				body.contentType = 2;
				body.service = this.obj.service[0].identifier;
			}
			// 有设置属性值则下发
			if (typeof value != 'undefined') {
				body.attributeMap = {};
				for (let val of this.path_list) {
					body.attributeMap[val.path_str] = value;
				}
			}
			// 有topic才能下发指令
			if (this.obj.topicId) {
				return this.request('put', `${sendCmdtoDevice}/${this.obj.topicId}`, this.token, body);
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
									if (this.data_type !== 'int' && this.data_type !== 'float' && this.data_type !== 'double' && this.data_type !== 'any') {
										return;
									}
									// data_type为any时能转数字转数字
									if (isNaN(Number(value))) {
										return;
									}
									// 滑块上报数据根据组件设置的步长限制精度
									let v = Number(value);
									let m = Math.pow(10, this.accuracy);
									this.value = Math.round(v * m) / m;
									break;
								case 'switch1':
								case 'switch1V':
								case 'switch2':
								case 'text-block':
									// 所有值转化成字符串匹配
									this.value = value + '';
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
					this.step = val.value;
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
					this.step = val.value;
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
        <marker :id="cus_id('arrow')" refX="-3" orient="auto" markerUnits="userSpaceOnUse" overflow="visible">
          <path :style="mark_style(obj.lineStyle)" transform="rotate(180)" d="M 0 0 L 8 -4 L 6 0 L 8 4 Z"></path>
        </marker>

        <marker :id="cus_id('err')" markerUnits="userSpaceOnUse" overflow="visible" orient="auto" refY="20" refX="40">
          <path d="M10 10 L30 30 M30 10 L10 30" stroke="red" stroke-width="3"></path>
        </marker>

        <marker :id="cus_id('dot')" markerUnits="userSpaceOnUse" overflow="visible" refX="10" refY="5">
          <circle cx="10" cy="10" r="10" :style="mark_style(obj.lineStyle)"></circle>
        </marker>
      </defs>

      <path :class="[is_full_line?'path2':'path']" :d="line_path" :style="line_style(obj.lineStyle)"></path>
    </svg>
  `,
	props: ['page'],
	mixins: [common_functions, fn],
	data() {
		return {
			// 不能用一个标识表示 因为是由两个设备状态组合判断 而每次收到的消息只有一台设备
			target_status: true, // 终端设备状态
			source_status: true, // 起始设备状态
		};
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
		// 线的样式
		line_style(style) {
			let t = {
				strokeWidth: `${style.strokeWidth}`,
			};
			// 先判断是实线还是流动虚线
			if (!this.is_full_line) {
				t.stroke = this.connect ? `${style.stroke}` : 'red';
				// 流动线才有虚线样式
				t.strokeDasharray = `${style.strokeDasharray}`;
				t.markerEnd = `url(#${this.obj.id}-arrow)`;
				// 流动线才需要判断连接标识
				// 如果断连 则添加标识
				if (!this.connect) {
					t.markerEnd = `url(#${this.obj.id}-err)`;
				}
			} else {
				t.stroke = `${style.stroke}`;
				t.markerEnd = `url(#${this.obj.id}-dot)`;
			}
			return t;
		},
		// 箭头样式
		mark_style(style) {
			let t = {};
			if (!this.is_full_line) {
				t.fill = this.connect ? `${style.stroke}` : 'red';
				t.stroke = this.connect ? `${style.stroke}` : 'red';
			} else {
				// 实线不需要判断断连
				t.fill = `${style.stroke}`;
			}
			return t;
		},
		// 自定义id 多个svg画布 有重复id 要做区分
		cus_id(type) {
			return `${this.obj.id}-${type}`;
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
			return this.target_status && this.source_status;
		},
		// 实线 虚线区分标识
		is_full_line() {
			// 有connection属性说明是流动线 有banEdit属性说明是实线 两个属性互斥
			return this.obj.lineStyle.banEdit !== undefined;
		},
	},
};
// 设备节点状态显示
let customDeviceStatus = {
	template: `
  <div :style="style(obj)" @mouseenter="hover(true)" @mouseleave="hover(false)" @click="go_to">
    <img class="bg_img" :src="obj.imageUrl">
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
			window.parent.postMessage({ device_id: this.obj.dataConfig.deviceId });
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
      <img v-show="current_page==obj.url" src="./img/icon1.png" class="bg_img">
      <span :style="size(obj)">{{text}}</span>
    </div>
  `,
	mixins: [common_functions, fn],
	props: ['current_page'],
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
			// 有跳转id 的不触发下发指令
			// this.obj.url ? this.$bus.$emit('turn_to_page', this.obj.url) : this.send_order(undefined);
			// 有没有跳转都检测有命令就下发
			this.send_order(undefined);
			if (this.obj.url) {
				this.$bus.$emit('turn_to_page', this.obj.url);
			}
		},
	},
};

// // 按钮开关
// let customButtonSwitch = {
// 	template: `
//     <div :style="style(obj)" class="center switch_box button" @click="switch_fn">
//       <div :style="bg()" class="bg_img"></div>
//       <span :style="size(obj)">{{value===on_value?text2:text}}</span>
//     </div>
//   `,
// 	mixins: [common_functions, fn],
// 	data() {
// 		return {
// 			value: this.obj.SwitchDisplaysOffStatus || '0', //当前值
// 			text: this.obj.value || '',
// 			text2: this.obj.value2 || '',
// 			on_value: this.obj.SwitchDisplaysOnStatus || '1', //开的值
// 			off_value: this.obj.SwitchDisplaysOffStatus || '0', //关的值
// 		};
// 	},
// 	methods: {
// 		switch_fn() {
// 			if (this.value === this.on_value) {
// 				this.value = this.off_value;
// 			} else if (this.value === this.off_value) {
// 				this.value = this.on_value;
// 			}
// 			let data;
// 			switch (this.data_type) {
// 				case 'int':
// 				case 'float':
// 				case 'double':
// 				case 'any':
// 					data = parseInt(this.value);
// 					break;
// 				case 'array':
// 				case 'struct':
// 					data = JSON.parse(this.value);
// 					break;
// 				default:
// 					data = this.value;
// 					break;
// 			}
// 			this.send_order(data);
// 		},
// 		size(obj_data) {
// 			let t = (203 / 22) * 16; //计算多少容器大小下 字体是16px
// 			let fz = (obj_data.w * this.radio) / t;
// 			return {
// 				color: '#fff',
// 				fontSize: fz + 'rem',
// 				zIndex: 1,
// 			};
// 		},
// 		bg() {
// 			return {
// 				background: this.value === this.on_value ? this.obj.background2 : this.obj.background,
// 			};
// 		},
// 	},
// };
// // 进度条
// let customProgress = {
// 	template: `
//     <div class="progress_box" :style="style(obj)">
//       <img src="./img/icon7.png" class="bg_img">
//       <span class="text" style="margin: 20px 0 10px 0;">{{obj.max}}</span>
//       <div class="progress">
//         <div class="lump flex_shrink" v-for="i in total_num" :style="color(i)"></div>
//       </div>
//       <span class="text" style="margin: 10px 0 20px 0;">{{obj.min}}</span>
//     </div>
//   `,
// 	mixins: [common_functions, fn],
// 	data() {
// 		return {
// 			block_h: 12, //方块大小
// 			value: 0,
// 		};
// 	},
// 	methods: {
// 		color(index) {
// 			// 10是单位，一个小方格大小+间隔=10
// 			let color;
// 			let max = Math.floor((this.total_height * 0.1) / this.block_h + 0.5);
// 			let mid = Math.floor((this.total_height * 0.2) / this.block_h + 0.5);
// 			let min = Math.floor((this.total_height * 0.3) / this.block_h + 0.5);
// 			if (index < max) {
// 				color = '#AB152E';
// 			} else if (index >= max && index < mid) {
// 				color = '#CB7E05';
// 			} else if (index >= mid && index < min) {
// 				color = '#1594FF';
// 			} else {
// 				color = '#1560FF';
// 			}
// 			// 显示效果时从下往上，但是节点渲染是从上往下，所以要用总数-基数
// 			let opacity = '0.5'; //单独维护的色块透明度
// 			if (index > this.render_num) {
// 				opacity = '1';
// 			}
// 			return { background: color, opacity: opacity };
// 		},
// 	},
// 	computed: {
// 		total_num() {
// 			return Math.floor(this.total_height / this.block_h);
// 		},
// 		render_num() {
// 			// 计算回显值占方块数
// 			let per = (this.value - this.obj.min) / (this.obj.max - this.obj.min);
// 			let n = Math.floor((this.total_height * per) / this.block_h + 0.5);
// 			return this.total_num - n;
// 		},
// 		total_height() {
// 			return this.obj.h * this.radio - 40;
// 		},
// 	},
// 	watch: {
// 		value() {
// 			if (this.value < this.obj.min) {
// 				this.value = this.obj.min;
// 			} else if (this.value > this.obj.max) {
// 				this.value = this.obj.max;
// 			}
// 		},
// 	},
// };
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
// // 输入框
// let customInput = {
// 	template: `
//     <el-input class="input_style" v-model="value" @change="comfirm_input" :style="style(obj)"
//     :placeholder="obj.placeholder" type="text" :maxlength="obj.maxlength" show-word-limit></el-input>
//   `,
// 	mixins: [common_functions, fn],
// 	data() {
// 		return {
// 			value: '',
// 		};
// 	},
// 	methods: {
// 		// 失去焦点或按下回车时提示确认下发指令信息
// 		async comfirm_input() {
// 			// 根据绑定属性转换输入值 如果没绑定属性则不进行
// 			if (!this.path_list.length) {
// 				return;
// 			}
// 			let value = Number(this.value);
// 			if (this.data_type === 'int' || this.data_type === 'float' || this.data_type === 'double') {
// 				// 如果绑定属性是数字但是输入内容无法转换成数字 则提示
// 				if (isNaN(value)) {
// 					this.$alert('输入内容与属性类型不符', '提示', {
// 						confirmButtonText: '确定',
// 					});
// 					return;
// 				}
// 			} else if (this.data_type === 'any') {
// 				if (isNaN(value)) {
// 					// 如果是any类型 又转不成数字则变回字符串
// 					value = this.value;
// 				}
// 			}
// 			let result = await this.$confirm(`确认下发指令${value}?`, '提示', {
// 				confirmButtonText: '确定',
// 				cancelButtonText: '取消',
// 			})
// 				.then(() => {
// 					return true;
// 				})
// 				.catch(() => {
// 					return false;
// 				});
// 			if (result) {
// 				this.send_order(value);
// 			}
// 		},
// 	},
// };
