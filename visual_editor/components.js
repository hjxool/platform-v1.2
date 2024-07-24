// 通用方法及变量
const fn = {
	props: ['obj', 'radio', 'token', 'device_id', 'inject_data'],
	data() {
		return {
			service: this.obj.service, //下发指令调用服务
			topic: this.obj.topic, //下发指令的topic
		};
	},
	beforeMount() {
		//#region
		// // 此处监听数据变化 根据路径判断是否赋值
		// this.$bus.$on('get_value', (data) => {
		// 	// 有回显数据时 传入的是一个原始结构对象 根据path属性解析路径取任意层级的值
		// 	// 此时是在组件挂载完毕时接收到的数据 path已经有了
		// 	if (!this.path) {
		// 		return;
		// 	}
		// 	let index = 0;
		// 	this.analysis_path(this.path_list, index, data);
		// });
		//#endregion
		// 监听收集当前(弹窗)面板有值的组件的键值对
		if (this.obj.是表单组件) {
			this.$bus.$on('popup_data_collect', (mb_id, total, key_value) => {
				if (!total) {
					// 没有可提交表单组件 不执行
					return;
				}
				// 判断当前组件是否在弹窗面板
				if (this.obj.隶属面板ID === mb_id) {
					// 所有下发值按组件绑定属性类型转换
					let value;
					switch (this.data_type) {
						case 'int':
						case 'float':
						case 'double':
						case 'any':
							value = isNaN(parseInt(this.value)) ? 0 : parseInt(this.value);
							break;
						case 'array':
						case 'struct':
							value = JSON.parse(this.value);
							break;
						default:
							value = this.value;
							break;
					}
					// 有的组件可能没绑定属性
					if (this.path && typeof this.path === 'string') {
						key_value[this.path] = value;
					}
					// 绑定完判断是否达到总表单组件数
					if (Object.entries(key_value).length === total) {
						// 不能在统计结束的组件上下发 会带有组件自身的额外参数进去 必须要返回对应提交按钮再下发
						this.$bus.$emit('popup_submit', mb_id, key_value);
					}
				}
			});
		}
	},
	// 卸载弹窗组件 监听的事件
	beforeDestroy() {
		// 只在弹窗内显示的组件才监听这一事件，所以可以一起销毁
		if (this.obj.是表单组件) {
			this.$bus.$off('popup_data_collect');
		}
	},
	// 弹窗使用v-if 会卸载组件 但是组件监听事件不会消失 因此所有组件注销时一定要
	methods: {
		send_order(value, flag) {
			if ((typeof value !== 'undefined' && !this.path) || this.obj.仅提交按钮下发数据) {
				// 值不为空 且 未绑定属性 不允许下发 不继续执行
				return;
			}
			let body = {
				contentType: 0,
				deviceId: this.device_id,
			};
			// 有服务则下发
			if (this.obj.service) {
				body.contentType = 2;
				body.service = this.service;
			}
			// 有设置属性值则下发
			let map = this.custom;
			if (typeof value != 'undefined') {
				// 提交按钮会收集一整个面板组件数据 组成键值对 所以要区分是替换还是拼接
				if (flag === 'replace') {
					map = { ...this.custom, ...value };
				} else {
					this.custom[this.path] = value;
					map = this.custom;
				}
			}
			body.attributeMap = map;
			// 有topic才能下发指令
			if (this.topic) {
				return this.request('put', `${sendCmdtoDevice}/${this.topic}`, this.token, body);
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
								case 'matrix':
									// 这里稍有特殊 矩阵所选的属性不对上传错误的数据格式时不能接收值
									if (typeof value === 'string') {
										return;
									}
									// 长度不够补零
									let l = this.obj.nh * this.obj.mw - value.length;
									for (let i = 0; i < l; i++) {
										value += '0';
									}
									// 传入的是字符串 根据行和列截断
									let arr = [];
									for (let index = 0; index < this.obj.nh; index++) {
										let row = value.substring(index * this.obj.mw, (index + 1) * this.obj.mw);
										let row2 = row.split('');
										let row3 = [];
										for (let val of row2) {
											row3.push(isNaN(Number(val)) ? 0 : Number(val));
										}
										arr.push(row3);
									}
									this.value = arr;
									break;
								case 'slider':
								case 'slider2':
								case 'progress':
									if (this.data_type !== 'int' && this.data_type !== 'float' && this.data_type !== 'float' && this.data_type !== 'any') {
										return;
									}
									// data_type为any时能转数字转数字
									if (isNaN(Number(value))) {
										return;
									}
									// 滑块上报数据根据组件设置的步长限制精度
									let v = Number(value);
									if (this.obj.type === 'progress') {
										this.accuracy = 2;
									}
									let m = Math.pow(10, this.accuracy);
									this.value = Math.round(v * m) / m;
									break;
								case 'switch':
								case 'switch2':
								case 'switch_button':
									// 所有值转化成字符串匹配
									this.value = value + '';
									break;
								case 'select':
								case 'radio':
									if (this.data_type === 'int' || this.data_type === 'float' || this.data_type === 'double') {
										this.value = Number(value);
									} else if (this.data_type === 'any') {
										this.value = isNaN(Number(value)) ? value : Number(value);
									} else {
										this.value = value;
									}
									break;
								case 'checkbox':
								case 'table':
									if (this.data_type !== 'array' && this.data_type !== 'any') {
										return;
									}
									if (!Array.isArray(value)) {
										return;
									}
									this.value = value;
									break;
								case 'text':
									this.value = value + '';
									break;
								case 'input':
									// 除了对象都能接收
									if (typeof value === 'object') {
										return;
									}
									this.value = value;
									break;
								case '状态组件':
									if (typeof value !== 'string' && typeof value !== 'number') {
										return;
									}
									// 所有值转化为字符串进行对比
									this.value = value + '';
									break;
								case '折线图':
									// 上报值中必须是 对象 有label字段 所有字段为数组
									// 上报值特殊 值是对象 需要自己拆解内部字段
									if (typeof value === 'object') {
										let arr = Object.entries(value);
										let flag;
										if (arr[0][1]?.propertyValue === undefined) {
											flag = 1;
											for (let val of arr) {
												if (!Array.isArray(val[1])) {
													return;
												}
											}
										} else {
											flag = 0;
											for (let val of arr) {
												if (!Array.isArray(val[1].propertyValue)) {
													return;
												}
											}
										}
										if (value.label) {
											// 组成一个数组 每个元素里面有 图例名 对应值
											this.y_data = [];
											for (let val of arr) {
												if (val[0] == 'label') {
													if (flag) {
														this.x_data = value.label;
													} else {
														this.x_data = value.label.propertyValue;
													}
												} else {
													let t = {
														name: val[0],
														value: flag ? val[1] : val[1].propertyValue,
													};
													this.y_data.push(t);
												}
											}
											// 所有条件满足 赋值完以后更新图表数据
											this.update_echart();
										}
									}
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
	},
	computed: {
		path() {
			let t = this.obj.attribute;
			if (t && t.length > 0) {
				let t2 = this.obj.attribute[this.obj.attribute.length - 1];
				return t2?.path || t2;
			} else {
				return null;
			}
		},
		path_list() {
			let path = this.path.split('.'); //以点分隔取层级 再看是否是数组下标的形式 再分隔层级
			for (let key in path) {
				let val = path[key];
				if (val.indexOf('[') != -1) {
					// 带数组下标的要 从当前位置删除当前元素 替换为两个新的元素
					let t = val.split('[');
					let t3 = [];
					for (let key2 in t) {
						let t2 = t[key2].replace(']', '');
						t3.push(t2);
					}
					path.splice(Number(key), 1, ...t3);
				}
			}
			return path;
		},
		data_type() {
			let t = this.obj.attribute;
			if (t && t.length > 0) {
				let t2 = this.obj.attribute[this.obj.attribute.length - 1];
				//最后一层数据类型 如果是旧数据则能转数字转数字
				return t2?.type || 'any';
			} else {
				return 'any';
			}
		},
		custom() {
			let t = {};
			for (let val of this.obj.customize) {
				if (!val?.key?.path) {
					break;
				}
				if (val?.key?.type === 'int') {
					val.value = isNaN(Number(val.value)) ? 0 : Number(val.value);
				}
				t[val.key.path] = val.value;
			}
			return t;
		},
	},
	watch: {
		// 组件挂载后才查询的数据
		inject_data(newvalue) {
			if (this.path) {
				let index = 0;
				this.analysis_path(this.path_list, index, newvalue);
			}
		},
	},
};
// 滑块组件
let customSlider = {
	template: `
    <div class="slider_box" :style="style(obj)">
      <img src="./img/icon6.png" class="bg_img">
      <span class="text text_ellipsis flex_shrink" :title="value_text">{{value_text}}</span>
      <div class="box1">
        <img src="./img/icon5.png" class="bg_img">
        <el-slider v-model="value" @change="send_order($event)" vertical :show-tooltip="false" :min="obj.min" :max="obj.max" :step="step"></el-slider>
      </div>
    </div>
  `,
	mixins: [common_functions, fn],
	data() {
		return {
			step: Number(this.obj.step) || 1, //步长
			value: 0,
		};
	},
	computed: {
		accuracy() {
			let t = this.obj.step + '';
			let t2 = t.split('.')[1];
			if (t2) {
				return t2.length;
			} else {
				return 0;
			}
		},
		value_text() {
			return `${this.value}${this.obj.units ? ' ' + this.obj.units : ''}`;
		},
	},
};
// 文本框
let customText = {
	template: `
    <div :style="text_style(obj)" @click="turn_to_page" :title="value">
      {{value}}
    </div>
  `,
	data() {
		return {
			value: this.obj.value || '',
		};
	},
	mixins: [common_functions, fn],
	methods: {
		// 根据文字以及容器大小截断文字
		cut() {
			let row = Math.floor(this.obj.h / this.obj.fontSize) - 1;
			let col = Math.floor(this.obj.w / this.obj.fontSize) - 1;
			let total = col * row;
			if (this.value.length >= total) {
				//删最3个字符
				this.value = this.value.substring(0, total - 3) + '...';
			}
		},
		// 有跳转id时 进行跳转功能
		turn_to_page() {
			this.obj.url ? this.$bus.$emit('turn_to_page', this.obj.url) : '';
		},
		// 文本框样式
		text_style(obj_data) {
			let t = (obj_data.w / obj_data.fontSize) * 16;
			let fz = (obj_data.w * this.radio) / t;
			return {
				position: 'absolute',
				width: obj_data.w * this.radio + 'px',
				height: obj_data.h * this.radio + 'px',
				lineHeight: obj_data.h * this.radio + 'px',
				top: obj_data.y * this.radio + 'px',
				left: obj_data.x * this.radio + 'px',
				zIndex: obj_data.z_index,
				textAlign: obj_data.align,
				color: obj_data.color,
				background: obj_data.background,
				fontSize: fz + 'rem',
				cursor: obj_data.url ? 'pointer' : 'initial',
			};
		},
	},
	//#region
	// watch: {
	// 	value(newv,oldv) {
	// 		if (oldv != newv) {
	// 			this.cut();
	// 		}
	// 	},
	// },
	//#endregion
};
// 图片
let customImg = {
	template: `
    <div @click="distinguish_operation" :style="style(obj)">
      <img class="bg_img" :src="obj.src" :style="{objectFit:obj.fls?'contain':'',cursor: 'pointer'}">
    </div>
  `,
	mixins: [common_functions, fn],
	props: ['current_page'],
	methods: {
		distinguish_operation() {
			if (this.obj.url) {
				this.$bus.$emit('turn_to_page', this.obj.url);
			}
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
			text: this.obj.value || '',
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
// 开关
let customSwitch = {
	template: `
    <div :style="style(obj)" class="switch_box" @click="switch_fn">
      <img v-show="value==on_value" :src="src(true)" class="bg_img" draggable="false">
      <img v-show="value==off_value" :src="src(false)" class="bg_img" draggable="false">
    </div>
  `,
	mixins: [common_functions, fn],
	data() {
		return {
			value: this.obj.SwitchDisplaysOffStatus || '0', //当前值
			on_value: this.obj.SwitchDisplaysOnStatus || '1', //开的值
			off_value: this.obj.SwitchDisplaysOffStatus || '0', //关的值
		};
	},
	methods: {
		switch_fn() {
			if (this.value === this.on_value) {
				this.value = this.off_value;
			} else if (this.value === this.off_value) {
				this.value = this.on_value;
			} else {
				// 上报的值不一定是开或关值 所以默认设为关值
				this.value = this.off_value;
			}
			let data;
			switch (this.data_type) {
				case 'int':
				case 'float':
				case 'double':
				case 'any':
					data = isNaN(parseInt(this.value)) ? 0 : parseInt(this.value);
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
				case 'switch':
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
			value: this.obj.SwitchDisplaysOffStatus || '0', //当前值
			text: this.obj.value || '',
			text2: this.obj.value2 || '',
			on_value: this.obj.SwitchDisplaysOnStatus || '1', //开的值
			off_value: this.obj.SwitchDisplaysOffStatus || '0', //关的值
		};
	},
	methods: {
		switch_fn() {
			if (this.value === this.on_value) {
				this.value = this.off_value;
			} else if (this.value === this.off_value) {
				this.value = this.on_value;
			} else {
				// 上报的值不一定是开或关值 所以默认设为关值
				this.value = this.off_value;
			}
			let data;
			switch (this.data_type) {
				case 'int':
				case 'float':
				case 'double':
				case 'any':
					data = isNaN(parseInt(this.value)) ? 0 : parseInt(this.value);
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
				background: this.value === this.on_value ? this.obj.background2 : this.obj.background,
			};
		},
	},
};
// 进度条
let customProgress = {
	template: `
    <div class="progress_box" :style="style(obj)">
      <img src="./img/icon7.png" class="bg_img">
      <span class="text" style="margin: 20px 0 10px 0;">{{obj.max}}</span>
      <div class="progress">
        <div class="lump flex_shrink" v-for="i in total_num" :style="color(i)"></div>
      </div>
      <span class="text" style="margin: 10px 0 20px 0;">{{obj.min}}</span>
    </div>
  `,
	mixins: [common_functions, fn],
	data() {
		return {
			block_h: 12, //方块大小
			value: 0,
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
			let per = (this.value - this.obj.min) / (this.obj.max - this.obj.min);
			let n = Math.floor((this.total_height * per) / this.block_h + 0.5);
			return this.total_num - n;
		},
		total_height() {
			return this.obj.h * this.radio - 40;
		},
	},
	watch: {
		value() {
			if (this.value < this.obj.min) {
				this.value = this.obj.min;
			} else if (this.value > this.obj.max) {
				this.value = this.obj.max;
			}
		},
	},
};
// 下拉框
let customSelector = {
	template: `
    <div class="select_box" :style="style(obj)" @click.stop="popup">
      <img src="./img/icon8.png" class="bg_img">
      <span class="text_ellipsis" :style="font_size(obj)" :title="label">{{label}}</span>
    </div>
  `,
	mixins: [common_functions, fn],
	props: ['select'],
	data() {
		return {
			label: '',
			value: '',
			id: `drop-${this.obj.id}`, // 记录组件id 在传入值时匹配用
		};
	},
	methods: {
		// 字体样式
		font_size(obj_data) {
			// let t = (203 / 16) * 16; //计算多少容器大小下 字体是16px
			// let fz = (obj_data.w * this.radio) / t;
			// 计算字体大小(px) 如果超过组件高度 则字体大小设为组件高度 小于组件高度则正常显示
			// let fpx = ((obj_data.w * this.radio) / 203) * 16;
			// if (fpx >= obj_data.h - 8) {
			// 	// 上下各留4px间距 默认根节点字体大小16px
			// 	fz = (obj_data.h - 8) / 16;
			// }
			return {
				color: '#fff',
				// fontSize: fz + 'rem',
				paddingRight: obj_data.w * this.radio * 0.152 + 'px',
				paddingLeft: obj_data.w * this.radio * 0.076 + 'px',
			};
		},
		// 显示弹窗
		popup() {
			this.$bus.$emit('drop_down_show', {
				list: this.options, // 传自身存的下拉列表
				// 计算弹窗显示位置
				left: this.obj.x * this.radio,
				top: (this.obj.y + this.obj.h) * this.radio + 14,
				id: this.id,
			});
		},
	},
	computed: {
		options() {
			let arr = [];
			if (this.data_type === 'int' || this.data_type === 'float' || this.data_type === 'double') {
				for (let val of this.obj.option) {
					let t = { label: val.label };
					// 选项中可能有字符
					t.value = isNaN(Number(val.value)) ? 0 : Number(val.value);
					arr.push(t);
				}
			} else if (this.data_type === 'any') {
				for (let val of this.obj.option) {
					let t = { label: val.label };
					t.value = isNaN(Number(val.value)) ? val.value : Number(val.value);
					arr.push(t);
				}
			} else {
				for (let val of this.obj.option) {
					let t = { label: val.label, value: val.value };
					arr.push(t);
				}
			}
			return arr;
		},
	},
	watch: {
		// 上报数据回显对应标签
		value(newvalue, oldvalue) {
			if ((this.data_type === 'int' || this.data_type === 'float' || this.data_type === 'double') && isNaN(newvalue)) {
				return;
			}
			for (let val of this.options) {
				if (val.value == newvalue) {
					this.label = val.label;
					break;
				}
			}
		},
		// 下拉框选的值不需要挂载时获取 所以可以在watch中监听 等值发生变化时处理
		select(newvalue) {
			// 对比当前组件id 匹配上了才更新值
			if (this.id === newvalue.id) {
				this.label = newvalue.label;
				this.value = newvalue.value;
				// 匹配到后 下发指令
				this.send_order(this.value);
			}
		},
	},
};
// 矩阵
let customMatrix = {
	template: `
  <div class="matrix" :style="matrix_style(obj)">
    <div class="matrix" v-for="row in obj.nh" :style="row_style(obj)">
      <div class="center button" v-for="col in obj.mw" @click="control(row-1,col-1)">
        <img v-show="value[row-1][col-1]" src="./img/icon9.png" class="bg_img">
        <img v-show="!value[row-1][col-1]" src="./img/icon10.png" class="bg_img">
      </div>
    </div>
  </div>
  `,
	mixins: [common_functions, fn],
	data() {
		return {
			value: this.init(),
		};
	},
	methods: {
		matrix_style(obj_data) {
			return {
				position: 'absolute',
				width: obj_data.w * this.radio + 'px',
				height: obj_data.h * this.radio + 'px',
				top: obj_data.y * this.radio + 'px',
				left: obj_data.x * this.radio + 'px',
				zIndex: obj_data.z_index,
				gridTemplateRows: `repeat(${obj_data.nh}, 1fr)`,
			};
		},
		row_style(obj_data) {
			return {
				gridTemplateColumns: `repeat(${obj_data.mw}, 1fr)`,
			};
		},
		control(row, col) {
			this.value[row].splice(col, 1, this.value[row][col] ? 0 : 1);
			let str = '';
			for (let val of this.value) {
				str += val.join('');
			}
			this.send_order(str);
		},
		init() {
			let t = [];
			for (let index = 0; index < this.obj.nh; index++) {
				let t2 = [];
				for (let index2 = 0; index2 < this.obj.mw; index2++) {
					t2.push(0);
				}
				t.push(t2);
			}
			return t;
		},
	},
};
// 单选框组
let customRadioGroup = {
	template: `
    <el-radio-group class="radio_group" :style="style(obj)" v-model="value" @change="send_order(value)">
      <el-radio v-for="item,index in options" :key="index" :label="item.value">{{item.label}}</el-radio>
    </el-radio-group>
  `,
	mixins: [common_functions, fn],
	data() {
		return {
			value: '',
		};
	},
	computed: {
		options() {
			let arr = [];
			if (this.data_type === 'int' || this.data_type === 'float' || this.data_type === 'double') {
				for (let val of this.obj.option) {
					let t = { label: val.label };
					// 选项中可能有字符
					t.value = isNaN(Number(val.value)) ? 0 : Number(val.value);
					arr.push(t);
				}
			} else if (this.data_type === 'any') {
				for (let val of this.obj.option) {
					let t = { label: val.label };
					t.value = isNaN(Number(val.value)) ? val.value : Number(val.value);
					arr.push(t);
				}
			} else {
				for (let val of this.obj.option) {
					let t = { label: val.label, value: val.value };
					arr.push(t);
				}
			}
			return arr;
		},
	},
};
// 多选框
let customCheckBox = {
	template: `
    <el-checkbox-group class="check_box" :style="style(obj)" v-model="value" @change="send_order(value)">
      <el-checkbox v-for="item,index in options" :key="index" :label="item.value">{{item.label}}</el-checkbox>
    </el-checkbox-group>
  `,
	mixins: [common_functions, fn],
	data() {
		return {
			value: [],
		};
	},
	computed: {
		options() {
			let arr = [];
			if (this.data_type === 'int' || this.data_type === 'float' || this.data_type === 'double') {
				for (let val of this.obj.option) {
					let t = { label: val.label };
					// 选项中可能有字符
					t.value = isNaN(Number(val.value)) ? 0 : Number(val.value);
					arr.push(t);
				}
			} else if (this.data_type === 'any') {
				for (let val of this.obj.option) {
					let t = { label: val.label };
					t.value = isNaN(Number(val.value)) ? val.value : Number(val.value);
					arr.push(t);
				}
			} else {
				for (let val of this.obj.option) {
					let t = { label: val.label, value: val.value };
					arr.push(t);
				}
			}
			return arr;
		},
	},
};
// 表格及控制按钮
let customTable = {
	template: `
    <el-table :data="value" :style="table_style(obj)" :max-height="maxheight">
      <el-table-column v-for="item in obj.option" :prop="item.value" :label="item.label"></el-table-column>
      <el-table-column label="操作">
        <template slot-scope="scope">
          <el-button v-for="button in obj.button" @click="table_button_order(button)" size="mini">{{button.label}}</el-button>
        </template>
      </el-table-column>
    </el-table>
  `,
	mixins: [common_functions, fn],
	data() {
		return {
			value: [],
		};
	},
	methods: {
		// 表格样式
		table_style(obj) {
			return {
				position: 'absolute',
				width: obj.w * this.radio + 'px',
				top: obj.y * this.radio + 'px',
				left: obj.x * this.radio + 'px',
				zIndex: obj.z_index,
			};
		},
		// 表格下发指令
		table_button_order(button) {
			let body = {
				contentType: 0,
				deviceId: this.device_id,
			};
			// 有服务则下发
			if (button.service) {
				body.contentType = 2;
				body.service = button.service;
			}
			// 有设置属性值则下发
			let t = JSON.parse(JSON.stringify(this.custom)); // 拷贝一份不修改原值
			if (button.value) {
				let p = button.attribute[button.attribute.length - 1];
				let path = p?.path || p;
				t[path] = button.value;
			}
			body.attributeMap = t;
			// 有topic才能下发指令
			if (button.topic) {
				this.request('put', `${sendCmdtoDevice}/${button.topic}`, this.token, body);
			}
		},
	},
	computed: {
		maxheight() {
			return this.obj.h * this.radio;
		},
	},
};
// 输入框
let customInput = {
	template: `
    <el-input class="input_style" v-model="value" @keyup.enter.native="comfirm_input" :style="style(obj)" 
    :placeholder="obj.placeholder" type="text" :maxlength="obj.maxlength" :show-word-limit="obj.显示输入限制"></el-input>
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
			if (!this.path) {
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
			} else {
				value = this.value;
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
// 状态组件
let customStatus = {
	template: `
  <div class="custom_status" :style="cus_style(obj)">
    <div :style="{color:color}">{{label}}</div>
  </div>
  `,
	mixins: [common_functions, fn],
	data() {
		return {
			value: this.obj['状态列表'][0].value, // 实际值
			label: this.obj['状态列表'][0].label, // 显示文字
			color: this.obj['状态列表'][0].color, // 对应文字颜色
		};
	},
	methods: {
		cus_style(obj) {
			let t = this.style(obj);
			t.background = obj.background;
			t.fontSize = obj.fontSize;
			switch (obj.align) {
				case 'left':
					t.justifyContent = 'flex-start';
					break;
				case 'right':
					t.justifyContent = 'flex-end';
					break;
				case 'center':
					t.justifyContent = 'center';
					break;
			}
			return t;
		},
	},
	watch: {
		// 每次值发生变化 计算新的显示文字和对应颜色
		value(newvalue, oldvalue) {
			for (let val of this.obj['状态列表']) {
				if (val.value == newvalue) {
					this.label = val.label;
					this.color = val.color;
				}
			}
		},
	},
};
// 图表
let customEchart = {
	template: `
    <div :id="id" :style="style(obj)"></div>
  `,
	mixins: [common_functions, fn],
	data() {
		return {
			id: `echart-${this.obj.id}`, // 绑定唯一id
		};
	},
	mounted() {
		// 生成echart对象
		this.echart = echarts.init(document.getElementById(this.id));
		this.init_echart();
	},
	methods: {
		// 初始化图表
		init_echart() {
			// 可能会有多条折线
			let option = {
				xAxis: {
					type: 'category',
					data: [],
					axisTick: {
						show: false, // 不显示坐标轴刻度线
					},
				},
				yAxis: {
					type: 'value',
					axisLabel: {
						formatter: '{value} ' + this.obj.units,
					},
				},
				legend: {}, // 显示图例 默认上方居中显示
				series: [],
			};
			this.echart.setOption(option);
		},
		// 更新图表数据 因为初始不知道有几条折线是根据上报数据决定 所以重写series配置项
		update_echart() {
			let series = [];
			for (let val of this.y_data) {
				let t = {
					name: val.name, // 对应图例名称
					data: val.value,
					type: 'line',
					label: {
						show: true, // 显示数值
						formatter: '{c} ' + this.obj.units, // 设置数值格式和单位
					},
				};
				series.push(t);
			}
			this.echart.setOption({ xAxis: { data: this.x_data }, series });
		},
	},
};
// 打开弹窗按钮
let customPopup = {
	template: `
    <div :style="style(obj)" class="popup_button center button_box" @click="open_popup">
      <span :style="size()">{{obj.value || ''}}</span>
    </div>
  `,
	mixins: [common_functions, fn],
	methods: {
		size() {
			return {
				color: '#fff',
				zIndex: 1,
			};
		},
		// 打开弹窗
		open_popup() {
			// 如果绑定了面板才触发事件
			if (this.obj.popup_data) {
				this.$bus.$emit('open_popup_data', this.obj.popup_data);
			}
		},
	},
};
// 提交按钮
let customSubmitButton = {
	template: `
    <div :style="style(obj)" class="popup_button center button_box" @click="submit">
      <span :style="size()">{{obj.value || ''}}</span>
    </div>
  `,
	mixins: [common_functions, fn],
	beforeMount() {
		this.$bus.$on('popup_submit', (mb_id, key_value) => {
			if (this.obj.隶属面板ID === mb_id) {
				// 是对应面板的提交按钮则将收集的数据下发
				this.send_order(key_value, 'replace');
			}
		});
	},
	// 提交按钮只在弹窗中 可以一起销毁事件
	beforeDestroy() {
		this.$bus.$off('popup_submit');
	},
	methods: {
		size() {
			return {
				color: '#fff',
				zIndex: 1,
			};
		},
		submit() {
			this.$bus.$emit('popup_data_collect', this.obj.隶属面板ID, this.obj.total, {});
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
        <el-slider v-model="value" @change="send_order($event)" :show-tooltip="false" :min="obj.min" :max="obj.max"
          :step="step" style="width:90%"></el-slider>
      </div>
    </div>
  `,
	mixins: [common_functions, fn],
	data() {
		return {
			value: 0,
			step: Number(this.obj.step) || 1, //步长
		};
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
			return `${this.value}${this.obj.units ? ' ' + this.obj.units : ''}`;
		},
	},
};
