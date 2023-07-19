let selector = {
	template: `
      <el-select v-model="value" @change="handle_change" style="width:120px;" size="mini">
          <el-option
            v-for="item in options"
            :label="item.label"
            :value="item.value"
            :key="item.value">
          </el-option>
      </el-select>
  `,
	data() {
		return {
			value: 0,
			options: [
				{ label: '顺序全开', value: 4095 },
				{ label: '顺序全关', value: 0 },
				{ label: '逆序全开', value: 8191 },
				{ label: '逆序全关', value: 4096 },
			],
		};
	},
	props: ['input'],
	mounted() {
		let i = Object.entries(this.input);
		if (i.length) {
			this.value = Number(i[0][1]);
		} else {
			let t = { control_relay: this.value };
			this.$emit('init_input', t);
		}
		this.init_text();
	},
	methods: {
		handle_change() {
			let t = { control_relay: this.value };
			this.$emit('init_input', t);
			this.init_text();
		},
		// 每次改变重新计算显示文字
		init_text() {
			let t = '';
			for (let val of this.options) {
				if (val.value === this.value) {
					t = val.label;
					break;
				}
			}
			this.$emit('text', t);
		},
	},
};
let order_control_relay = {
	template: `
      <div class="row_layout">
          <el-select v-model="value" style="width: 60px;margin-right: 10px;" @change="change1" size="mini">
            <el-option v-for="item in options" :label="item.label" :value="item.value" :key="item.value">
            </el-option>
          </el-select>
          <el-select v-model="value2" multiple collapse-tags style="width: 150px;" @change="change2" size="mini">
            <el-option v-for="item in 12" :label="label(item)" :value="item" :key="item">
            </el-option>
          </el-select>
      </div>
  `,
	data() {
		return {
			value: 0,
			options: [
				{ label: '开', value: 255 },
				{ label: '关', value: 0 },
			],
			value2: [1],
		};
	},
	props: ['input'],
	mounted() {
		let i = Object.entries(this.input);
		if (i.length) {
			let t = i[0][1];
			this.value = Number(t[0]);
			this.value2 = [];
			for (let i = 1; i < t.length; i++) {
				this.value2.push(Number(t[i]));
			}
		} else {
			// order_control_relay第一个元素是开关状态 从第一个元素之后才表示通道
			let t = {
				order_control_relay: [0, 1],
			};
			this.$emit('init_input', t);
		}
		this.init_text();
	},
	methods: {
		label(num) {
			return `通道${num}`;
		},
		change1(value) {
			let t = {
				order_control_relay: [value, ...this.value2],
			};
			this.$emit('init_input', t);
			this.init_text();
		},
		change2(value) {
			if (value.length == 0) {
				this.$message('至少选择一个通道');
				this.value2 = [1];
			}
			let t = {
				order_control_relay: [this.value, ...value],
			};
			this.$emit('init_input', t);
			this.init_text();
		},
		// 每次改变重新计算显示文字
		init_text() {
			let t = '';
			for (let val of this.options) {
				if (val.value === this.value) {
					t = val.label;
				}
			}
			t += `:通道${this.value2.join('、')}`;
			this.$emit('text', t);
		},
	},
};
let selector2 = {
	template: `
      <el-select v-model="value" @change="handle_change" style="width:120px;" size="mini">
          <el-option
            v-for="item in options"
            :label="item.label"
            :value="item.value"
            :key="item.value">
          </el-option>
      </el-select>
  `,
	data() {
		return {
			value: 0,
			options: [
				{ label: '开', value: 1 },
				{ label: '关', value: 0 },
			],
		};
	},
	props: ['item'],
	mounted() {
		let index = this.item.identifier.substring(3, 4);
		this.keyword = `SEQ${index}`;
		let i = Object.entries(this.item.serviceInputParam);
		if (i.length) {
			this.value = Number(i[0][1]);
		} else {
			let t = {};
			t[this.keyword] = this.value;
			this.item.serviceInputParam = t;
		}
		this.init_text();
	},
	methods: {
		handle_change() {
			let t = {};
			t[this.keyword] = this.value;
			this.item.serviceInputParam = t;
			this.init_text();
		},
		// 每次改变重新计算显示文字
		init_text() {
			let t = '';
			for (let val of this.options) {
				if (val.value === this.value) {
					t = val.label;
				}
			}
			this.item.inputParamDesc = t;
		},
	},
};
let selector3 = {
	template: `
      <el-select v-model="value" @change="handle_change" style="width:120px;" size="mini">
          <el-option
            v-for="item in options"
            :label="item.label"
            :value="item.value"
            :key="item.value">
          </el-option>
      </el-select>
  `,
	data() {
		return {
			value: 0,
			options: [
				{ label: '开', value: 1 },
				{ label: '关', value: 0 },
			],
		};
	},
	props: ['input', 'keyword'],
	mounted() {
		let i = Object.entries(this.input);
		if (i.length) {
			this.value = Number(i[0][1]);
		} else {
			let t = {};
			t[this.keyword] = this.value;
			this.$emit('init_input', t);
		}
		this.init_text();
	},
	methods: {
		handle_change() {
			let t = {};
			t[this.keyword] = this.value;
			this.$emit('init_input', t);
			this.init_text();
		},
		// 每次改变重新计算显示文字
		init_text() {
			let t = '';
			for (let val of this.options) {
				if (val.value === this.value) {
					t = val.label;
					break;
				}
			}
			this.$emit('text', t);
		},
	},
};
let set_value = {
	template: `
    <el-input v-model="value" @input="input_value(500)"
     size="mini" placeholder="设置值" style="width:100px;">
    </el-input>
  `,
	data() {
		return {
			value: '', // 输入显示值
			timer: null, // 存储定时器
			_value: '', // 真正传的值
		};
	},
	props: ['input', 'keyword', 'reg_type'],
	mounted() {
		let i = Object.entries(this.input);
		if (i.length) {
			this._value = this.value = Number(i[0][1]);
		} else {
			let t = {};
			t[this.keyword] = this._value;
			this.$emit('init_input', t);
		}
		this.init_text();
	},
	methods: {
		init_text() {
			this.$emit('text', this._value);
		},
		// 防抖验证输入是否符合
		input_value(delay) {
			clearTimeout(this.timer);
			this.timer = setTimeout(() => {
				let reg;
				switch (this.reg_type) {
					case 'number':
						reg = /(^[0-9]$)|(^1[0-5]$)/;
						break;
					case 'string':
						reg = /^[\u4E00-\u9FA5A-Za-z0-9_]+$/;
						break;
					default:
						// 如果传入空字符串就不继续执行
						return;
				}
				if (reg.test(this.value)) {
					this._value = this.value;
				} else {
					this.$message.error('输入值不符');
					this.value = this._value;
				}
				let t = {};
				t[this.keyword] = this.value;
				this.$emit('init_input', t);
				this.init_text();
			}, delay);
		},
	},
};
// 必须声明在下面 因为注册使用的组件必须先声明
let all_components = {
	template: `
  <div>
    <selector class="flex_shrink" v-if="components_show(server,'selector')"
      :input="server.serviceInputParam" @init_input="server.serviceInputParam=$event"
      @text="server.inputParamDesc=$event">
    </selector>

    <order_control_relay class="flex_shrink"
      v-if="components_show(server,'order_control_relay')"
      :input="server.serviceInputParam" @init_input="server.serviceInputParam=$event"
      @text="server.inputParamDesc=$event"></order_control_relay>

    <selector2 class="flex_shrink"
      v-if="components_show(server,'selector2')" :item="server">
    </selector2>

    <selector3 class="flex_shrink" v-if="components_show(server,'selector3')"
       :input="server.serviceInputParam" @init_input="server.serviceInputParam=$event"
       @text="server.inputParamDesc=$event" :keyword="server.keyword">
    </selector3>

    <set_value class="flex_shrink" v-if="components_show(server,'set_value')" 
     :input="server.serviceInputParam" :keyword="server.keyword" :reg_type="server.reg_type"
      @init_input="server.serviceInputParam=$event" @text="server.inputParamDesc=$event">
    </set_value>

    <el-button class="flex_shrink"
      v-if="components_show(server,'config_button')"
      @click="turn_to_page('publish',server)" round size="mini">配置</el-button>
  </div>
  `,
	components: { selector, selector2, order_control_relay, selector3, set_value },
	props: ['server', 'turn_to_page'],
	methods: {
		// 条件渲染组件
		components_show(server, cname) {
			switch (cname) {
				case 'selector':
					if (server.serviceIdentifier === 'Relay_Set_State_Service' && server.productId === '1574321115531005952') {
						return true;
					}
					break;
				case 'order_control_relay':
					if (server.serviceIdentifier === 'Accord_Order_TO_Control_Relay_Service' && server.productId === '1574321115531005952') {
						return true;
					}
					break;
				case 'selector2':
					if (server.productId === '1564171104871739392') {
						let reg = /(^SEQ\d+SRV$)|(^SEQ[A-Z]SRV$)/;
						if (reg.test(server.serviceIdentifier)) {
							return true;
						}
					}
					break;
				case 'config_button':
					if (server.serviceIdentifier === 'publishTask' && server.productId === '1559733901001211904') {
						return true;
					}
					break;
				case 'selector3':
					if (server.serviceIdentifier === 'setScreenStatus' && server.productId === '1559733901001211904') {
						server.keyword = 'turnBacklight';
						return true;
					}
					break;
				case 'set_value':
					if (server.serviceIdentifier === 'setVolume' && server.productId === '1559733901001211904') {
						server.keyword = 'volume';
						server.reg_type = 'number';
						return true;
					}
					break;
			}
			return false;
		},
	},
};
