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
		if (typeof this.input == 'object') {
			this.value = Number(Object.entries(this.input)[0][1]);
		} else if (typeof this.input == 'string') {
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
		if (typeof this.input == 'string') {
			// order_control_relay第一个元素是开关状态 从第一个元素之后才表示通道
			let t = {
				order_control_relay: [0, 1],
			};
			this.$emit('init_input', t);
		} else if (typeof this.input == 'object') {
			let t = Object.entries(this.input)[0][1];
			this.value = Number(t[0]);
			this.value2 = [];
			for (let i = 1; i < t.length; i++) {
				this.value2.push(Number(t[i]));
			}
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
		if (typeof this.item.serviceInputParam == 'string') {
			let t = {};
			t[this.keyword] = this.value;
			this.item.serviceInputParam = t;
		} else if (typeof this.item.serviceInputParam == 'object') {
			this.value = Number(Object.entries(this.item.serviceInputParam)[0][1]);
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
