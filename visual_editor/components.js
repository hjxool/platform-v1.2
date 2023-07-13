// 通用方法及变量
const fn = {
	props: ['obj', 'radio'],
	data() {
		return {
			service: this.obj.service, //下发指令调用服务
			topic: this.obj.topic, //下发指令的topic
		};
	},
	beforeMount() {
		// 此处监听数据变化 根据路径判断是否赋值
		this.$bus.$on('get_value', (data) => {
			// 有回显数据时 传入的是一个原始结构对象 根据path属性解析路径取任意层级的值
			// 此时是在组件挂载完毕时接收到的数据 path已经有了
			if (!this.path) {
				return;
			}
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
			let index = 0;
			this.analysis_path(path, index, data);
		});
		this.$bus.$on('common_params', (...val) => {
			this.token = val[0];
			this.device_id = val[1];
		});
	},
	methods: {
		send_order(value) {
			if (!this.path) {
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
			if (typeof value != 'undefined') {
				this.custom[this.path] = value;
			}
			body.attributeMap = this.custom;
			// 有topic才能下发指令
			if (this.topic) {
				this.request('put', `${sendCmdtoDevice}/${this.topic}`, this.token, body);
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
						if (Array.isArray(source)) {
							value = source[key];
						} else {
							value = source[key].propertyValue;
						}
						if (path_index == path.length - 1) {
							// 如果是path最后一层则取值
							switch (this.obj.type) {
								case 'matrix':
									// 这里稍有特殊 矩阵所选的属性不对上传错误的数据格式时不能接收值
									if (typeof value !== 'string') {
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
								case 'progress':
									if (this.data_type !== 'int' && this.data_type !== 'float' && this.data_type !== 'double' && this.data_type !== 'any') {
										return;
									}
									// data_type为any时能转数字转数字
									if (isNaN(Number(value))) {
										return;
									}
									this.value = Number(value);
									break;
								case 'switch':
								case 'switch_button':
									if (this.data_type !== 'int' && this.data_type !== 'any') {
										return;
									}
									if (Number(value) !== 0 && Number(value) !== 1) {
										return;
									}
									this.value = value;
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
									// 除了对象都能接收
									if (typeof value === 'object') {
										return;
									}
									this.value = value;
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
				// return this.obj.attribute[this.obj.attribute.length - 1].replace(/\.propertyValue/g, '');
				let t2 = this.obj.attribute[this.obj.attribute.length - 1];
				return t2?.path || t2;
			} else {
				return null;
			}
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
					val.value = Number(val.value);
				}
				t[val.key.path] = val.value;
			}
			return t;
		},
	},
};
// 滑块组件
let customSlider = {
	template: `
    <div class="slider_box" :style="style(obj)">
      <img src="./img/icon6.png" class="bg_img">
      <span class="text text_ellipsis flex_shrink" :title="value+' dB'">{{value}} dB</span>
      <div class="box1">
        <img src="./img/icon5.png" class="bg_img">
        <el-slider v-model="value" @change="send_order($event)" vertical :show-tooltip="false" :min="obj.min" :max="obj.max" :step="step"></el-slider>
      </div>
    </div>
  `,
	mixins: [common_functions, fn],
	data() {
		return {
			step: this.obj.step, //步长
			value: 0,
		};
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
    <div :style="style(obj)">
      <img class="bg_img" :src="obj.src" :style="{objectFit:obj.fls?'contain':''}">
    </div>
  `,
	mixins: [common_functions, fn],
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
			this.obj.url ? this.$bus.$emit('turn_to_page', this.obj.url) : this.send_order(undefined);
		},
	},
};
// 开关
let customSwitch = {
	template: `
    <div :style="style(obj)" class="switch_box" @click="switch_fn">
      <img v-show="value" src="./img/icon3.png" class="bg_img" draggable="false">
      <img v-show="!value" src="./img/icon4.png" class="bg_img" draggable="false">
    </div>
  `,
	mixins: [common_functions, fn],
	data() {
		return {
			value: 0,
		};
	},
	methods: {
		switch_fn() {
			this.value = this.value ? 0 : 1;
			this.send_order(this.value);
		},
	},
};
// 按钮开关
let customButtonSwitch = {
	template: `
    <div :style="style(obj)" class="center switch_box button" @click="switch_fn">
      <div :style="bg()" class="bg_img"></div>
      <span :style="size(obj)">{{value?text2:text}}</span>
    </div>
  `,
	mixins: [common_functions, fn],
	data() {
		return {
			value: 0,
			text: this.obj.value || '',
			text2: this.obj.value2 || '',
		};
	},
	methods: {
		switch_fn() {
			this.value = this.value ? 0 : 1;
			this.send_order(this.value);
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
				background: this.value ? this.obj.background2 : this.obj.background,
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
	props: ['group'],
	data() {
		return {
			label: '',
			value: '',
		};
	},
	beforeMount() {
		this.$bus.$on('selector', (...params) => {
			if (params[0] == this.group) {
				this.label = params[1].label;
				this.value = params[1].value;
			}
		});
	},
	methods: {
		// 字体样式
		font_size(obj_data) {
			let t = (203 / 22) * 16; //计算多少容器大小下 字体是16px
			let fz = (obj_data.w * this.radio) / t;
			return {
				color: '#fff',
				fontSize: fz + 'rem',
				paddingRight: obj_data.w * this.radio * 0.152 + 'px',
				paddingLeft: obj_data.w * this.radio * 0.076 + 'px',
			};
		},
		// 显示弹窗
		popup() {
			this.$bus.$emit('display_popup', this.group, true);
			this.$bus.$emit('current_group', this.group);
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
			}
			return arr;
		},
	},
	watch: {
		value(newvalue, oldvalue) {
			if (newvalue != oldvalue) {
				for (let val of this.options) {
					if (val.value == newvalue) {
						this.label = val.label;
						break;
					}
				}
			}
		},
	},
};
let customPopup = {
	template: `
    <el-card v-show="display" :style="position(obj)" :body-style="{overflow:'auto',maxHeight:'500px'}" shadow="never">
      <div class="popup_text" :style="size(obj)" v-for="item,index in options" :key="index" @click="select(item)">{{item.label}}</div>
    </el-card>
  `,
	mixins: [common_functions, fn],
	props: ['group'],
	beforeMount() {
		this.$bus.$on('display_popup', (index, show) => {
			if (index == this.group) {
				this.display = show;
			}
		});
	},
	data() {
		return {
			display: false,
		};
	},
	methods: {
		// 弹窗定位
		position(obj_data) {
			// 当弹窗显示不下在反方向显示
			let t = (obj_data.y + obj_data.h) * this.radio + 14;
			let t2 = obj_data.x * this.radio;
			return {
				position: 'absolute',
				zIndex: '990',
				left: t2 + 'px',
				top: t + 'px',
			};
		},
		// 选择值
		select(obj) {
			this.$bus.$emit('selector', this.group, obj);
			this.send_order(obj.value);
		},
		// 字体大小 控制弹窗缩放
		size(obj) {
			let t = (203 / 22) * 16; //计算多少容器大小下 字体是16px
			let fz = (obj.w * this.radio) / t;
			if (fz > 1) {
				fz = 1;
			}
			return {
				fontSize: fz + 'rem',
			};
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
			}
			return arr;
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
