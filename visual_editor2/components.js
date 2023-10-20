// 通用方法及变量
const fn = {
	props: ['obj', 'radio'],
	beforeMount() {
		// 此处监听数据变化 根据路径判断是否赋值
		this.$bus.$on('get_value', (res) => {
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
									if (this.data_type !== 'int' && this.data_type !== 'float' && this.data_type !== 'float' && this.data_type !== 'any') {
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
									// 所有值转化成字符串匹配
									this.value = value + '';
									break;
								case 'text-block':
									this.value = value + '';
									break;
							}
						} else {
							// 否则继续递归
							this.analysis_path(path, ++path_index, value);
						}
						break;
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
			}
			if (obj_data.style.fontWeight) {
				t['fontWeight'] = obj_data.style.fontWeight;
			}
			if (obj_data.style.fontColor) {
				t['fontColor'] = obj_data.style.fontColor;
			}
			if (obj_data.style.backgroundColor) {
				t['backgroundColor'] = obj_data.style.backgroundColor;
			}
			if (obj_data.style.fontColor) {
				t['fontColor'] = obj_data.style.fontColor;
			}
			if (obj_data.style.strokeWidth) {
				t['borderWidth'] = obj_data.style.strokeWidth;
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
    <svg>
      <!-- 预设的箭头图标 -->
      <defs>
        <marker refX="-3" id="arrow" orient="auto" markerUnits="userSpaceOnUse" overflow="visible">
          <path stroke="#1890ff" fill="#1890ff" transform="rotate(180)" d="M 0 0 L 8 -4 L 6 0 L 8 4 Z"></path>
        </marker>
      </defs>
      <path class="path" :d="obj.path"></path>
    </svg>
  `,
};

// // 按钮
// let customButton = {
// 	template: `
//     <div :style="style(obj)" class="center button_box" @click="distinguish_operation">
//       <img v-show="current_page==obj.url" src="./img/icon1.png" class="bg_img">
//       <span :style="size(obj)">{{text}}</span>
//     </div>
//   `,
// 	mixins: [common_functions, fn],
// 	props: ['current_page'],
// 	data() {
// 		return {
// 			text: this.obj.value || '',
// 		};
// 	},
// 	methods: {
// 		size(obj_data) {
// 			let t = (203 / 22) * 16; //计算多少容器大小下 字体是16px
// 			let fz = (obj_data.w * this.radio) / t;
// 			return {
// 				color: '#fff',
// 				fontSize: fz + 'rem',
// 				zIndex: 1,
// 			};
// 		},
// 		// 按钮分下发指令和切换页面两种
// 		distinguish_operation() {
// 			// 有跳转id 的不触发下发指令
// 			// this.obj.url ? this.$bus.$emit('turn_to_page', this.obj.url) : this.send_order(undefined);
// 			// 有没有跳转都检测有命令就下发
// 			this.send_order(undefined);
// 			if (this.obj.url) {
// 				this.$bus.$emit('turn_to_page', this.obj.url);
// 			}
// 		},
// 	},
// };
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
