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
        { label: "顺序全开", value: 4095 },
        { label: "顺序全关", value: 0 },
        { label: "逆序全开", value: 8191 },
        { label: "逆序全关", value: 4096 },
      ],
    };
  },
  props: ["input"],
  mounted() {
    let i = Object.entries(this.input);
    if (i.length) {
      this.value = Number(i[0][1]);
    } else {
      let t = { control_relay: this.value };
      this.$emit("init_input", t);
    }
    this.init_text();
  },
  methods: {
    handle_change() {
      let t = { control_relay: this.value };
      this.$emit("init_input", t);
      this.init_text();
    },
    // 每次改变重新计算显示文字
    init_text() {
      let t = "";
      for (let val of this.options) {
        if (val.value === this.value) {
          t = val.label;
          break;
        }
      }
      this.$emit("text", t);
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
        { label: "开", value: 255 },
        { label: "关", value: 0 },
      ],
      value2: [1],
    };
  },
  props: ["input"],
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
      this.$emit("init_input", t);
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
      this.$emit("init_input", t);
      this.init_text();
    },
    change2(value) {
      if (value.length == 0) {
        this.$message("至少选择一个通道");
        this.value2 = [1];
      }
      let t = {
        order_control_relay: [this.value, ...value],
      };
      this.$emit("init_input", t);
      this.init_text();
    },
    // 每次改变重新计算显示文字
    init_text() {
      let t = "";
      for (let val of this.options) {
        if (val.value === this.value) {
          t = val.label;
        }
      }
      t += `:通道${this.value2.join("、")}`;
      this.$emit("text", t);
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
        { label: "开", value: 1 },
        { label: "关", value: 0 },
      ],
    };
  },
  props: ["item"],
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
      let t = "";
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
        { label: "开", value: 1 },
        { label: "关", value: 0 },
      ],
    };
  },
  props: ["input", "keyword"],
  mounted() {
    let i = Object.entries(this.input);
    if (i.length) {
      this.value = Number(i[0][1]);
    } else {
      let t = {};
      t[this.keyword] = this.value;
      this.$emit("init_input", t);
    }
    this.init_text();
  },
  methods: {
    handle_change() {
      let t = {};
      t[this.keyword] = this.value;
      this.$emit("init_input", t);
      this.init_text();
    },
    // 每次改变重新计算显示文字
    init_text() {
      let t = "";
      for (let val of this.options) {
        if (val.value === this.value) {
          t = val.label;
          break;
        }
      }
      this.$emit("text", t);
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
      value: "", // 输入显示值
      timer: null, // 存储定时器
      _value: "", // 真正传的值
    };
  },
  props: ["input", "keyword", "reg_type"],
  mounted() {
    let i = Object.entries(this.input);
    if (i.length) {
      this._value = this.value = Number(i[0][1]);
    } else {
      let t = {};
      t[this.keyword] = this._value;
      this.$emit("init_input", t);
    }
    this.init_text();
  },
  methods: {
    init_text() {
      this.$emit("text", this._value);
    },
    // 防抖验证输入是否符合
    input_value(delay) {
      clearTimeout(this.timer);
      this.timer = setTimeout(() => {
        let reg;
        switch (this.reg_type) {
          case "number":
            reg = /(^[0-9]$)|(^1[0-5]$)/;
            break;
          case "string":
            reg = /^[\u4E00-\u9FA5A-Za-z0-9_]+$/;
            break;
          default:
            // 如果传入空字符串就不继续执行
            return;
        }
        if (reg.test(this.value)) {
          this._value = this.value;
        } else {
          this.$message.error("输入值不符");
          this.value = this._value;
        }
        let t = {};
        t[this.keyword] = this.value;
        this.$emit("init_input", t);
        this.init_text();
      }, delay);
    },
  },
};
// 场景调用服务
let selector4 = {
  template: `
      <el-select v-model="value" multiple collapse-tags clearable placeholder="场景菜单" @change="handle_change" style="width:150px;" size="mini">
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
      value: [],
      options: [
        { label: "场景1", value: 0 },
        { label: "场景2", value: 1 },
        { label: "场景3", value: 2 },
        { label: "场景4", value: 3 },
        { label: "场景5", value: 4 },
        { label: "场景6", value: 5 },
        { label: "场景7", value: 6 },
        { label: "场景8", value: 7 },
        { label: "场景9", value: 8 },
        { label: "场景10", value: 9 },
        { label: "场景11", value: 10 },
        { label: "场景12", value: 11 },
        { label: "场景13", value: 12 },
        { label: "场景14", value: 13 },
        { label: "场景15", value: 14 },
        { label: "场景16", value: 15 },
      ],
      arr: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    };
  },
  props: ["input"],
  mounted() {
    let i = Object.entries(this.input);
    if (i.length) {
      let t = i[0][1];
      this.value = this.findIndices(t);
    } else {
      this.$emit("init_input", {
        SCALL: [...this.arr],
      });
    }
    this.init_text();
  },
  methods: {
    findIndices(arr) {
      return arr.reduce((indices, value, index) => {
        if (value === 1) {
          indices.push(index);
        }
        return indices;
      }, []);
    },
    handle_change() {
      if (this.value.length) {
        this.value.forEach((item) => {
          this.arr[item] = 1;
        });
      } else {
        this.arr = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      }
      this.$emit("init_input", {
        SCALL: [...this.arr],
      });
      this.init_text();
    },
    // 每次改变重新计算显示文字
    init_text() {
      let str = "";
      let t = [];
      this.value.forEach((item) => {
        t.push(this.options[item].label);
      });
      str += `调用:${t.join("、")}`;
      this.$emit("text", str);
    },
  },
};
// 串口控制
let extransrv = {
  template: `
      <div class="row_layout">
          <el-select v-model="value" placeholder="转发协议"  @change="change1" size="mini" style="width: 100px;margin-right: 10px;">
            <el-option v-for="item in options" :label="item.label" :value="item.value" :key="item.value">
            </el-option>
          </el-select>
          <el-select v-model="value2" placeholder="串口"  @change="change2" size="mini" style="width: 100px;margin-right: 10px;">
            <el-option v-for="item in options2" :label="item.label" :value="item.value" :key="item.value">
            </el-option>
          </el-select>
          <el-select v-model="value3" placeholder="编码格式" @change="change3" size="mini" style="width: 100px;margin-right: 10px;">
            <el-option v-for="item in options3" :label="item.label" :value="item.value" :key="item.value">
            </el-option>
          </el-select>
          <el-input v-model="Cmd" placeholder="请输入指令" @blur="change4" size="mini" style="width: 150px" />
      </div>
  `,
  data() {
    return {
      value: 0,
      options: [
        { label: "232", value: 0 },
        { label: "485", value: 1 },
      ],
      value2: 1,
      options2: [
        { label: "串口1", value: 1 },
        { label: "串口2", value: 2 },
        { label: "串口3", value: 3 },
      ],
      value3: 0,
      options3: [
        { label: "hex", value: 0 },
        { label: "string", value: 1 },
      ],
      Cmd: "",
    };
  },
  props: ["input"],
  mounted() {
    let i = Object.entries(this.input);
    if (i.length) {
      const obj = i[0][1];
      this.value = obj.Count;
      this.value2 = obj.Type;
      this.value3 = obj.Fmat;
      this.Cmd = obj.Cmd;
    } else {
      const obj = {
        CCCMD: {
          Count: this.value,
          Type: this.value2,
          Fmat: this.value3,
          Cmd: this.Cmd,
          Config: [0, 0, 0, 0],
        },
      };
      this.$emit("init_input", obj);
    }
    this.init_text();
  },
  methods: {
    change1() {
      const obj = {
        CCCMD: {
          Count: this.value,
          Type: this.value2,
          Fmat: this.value3,
          Cmd: this.Cmd,
          Config: [0, 0, 0, 0],
        },
      };
      this.$emit("init_input", obj);
      this.init_text();
    },
    change2() {
      const obj = {
        CCCMD: {
          Count: this.value,
          Type: this.value2,
          Fmat: this.value3,
          Cmd: this.Cmd,
          Config: [0, 0, 0, 0],
        },
      };
      this.$emit("init_input", obj);
      this.init_text();
    },
    change3() {
      const obj = {
        CCCMD: {
          Count: this.value,
          Type: this.value2,
          Fmat: this.value3,
          Cmd: this.Cmd,
          Config: [0, 0, 0, 0],
        },
      };
      this.$emit("init_input", obj);
      this.init_text();
    },
    change4() {
      const obj = {
        CCCMD: {
          Count: this.value,
          Type: this.value2,
          Fmat: this.value3,
          Cmd: this.Cmd,
          Config: [0, 0, 0, 0],
        },
      };
      this.$emit("init_input", obj);
      this.init_text();
    },
    // 每次改变重新计算显示文字
    init_text() {
      const 转发协议 = this.options.find((val) => {
        return val.value == this.value;
      })?.label;
      const 串口 = this.options2.find((val) => {
        return val.value == this.value2;
      })?.label;

      const 编码格式 = this.options3.find((val) => {
        return val.value == this.value3;
      })?.label;
      const 指令 = this.Cmd;
      const str = `转发协议:${转发协议},${串口},编码格式:${编码格式},指令:${指令}`;
      this.$emit("text", str);
    },
  },
};
// 会议模式
let selector5 = {
  template: `
      <el-select v-model="value"  @change="change" style="width:120px;" size="mini">
          <el-option
            v-for="item in options"
            :label="item.label"
            :value="item.value"
            :key="item.value['fun4.fun4_para1[0]']">
          </el-option>
      </el-select>
  `,
  data() {
    return {
      value: 0,
      options: [
        {
          label: "先进先出",
          value: 0,
        },
        {
          label: "限时发言",
          value: 1,
        },
        {
          label: "申请发言",
          value: 2,
        },
        {
          label: "声控发言",
          value: 3,
        },
      ],
    };
  },
  props: ["input"],
  mounted() {
    if (Object.keys(this.input).length > 0) {
      this.value = this.input["fun4.fun4_para1[0]"];
    } else {
      this.$emit("init_input", {
        actual_used_lenth: 1,
        "fun4.fun4_para1[0]": this.value,
      });
    }
    this.init_text();
  },
  methods: {
    change() {
      const obj = {
        actual_used_lenth: 1,
        "fun4.fun4_para1[0]": this.value,
      };
      this.$emit("init_input", obj);
      this.init_text();
    },
    // 每次改变重新计算显示文字
    init_text() {
      const str = this.options.find((val) => {
        return val.value == this.value;
      })?.label;
      this.$emit("text", `会议模式:${str}`);
    },
  },
};
// 功放开关
let selector6 = {
  template: `
      <el-select v-model="value"  @change="change" style="width:120px;" size="mini">
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
        {
          label: "功放开",
          value: 1,
        },
        {
          label: "功放关",
          value: 0,
        },
      ],
    };
  },
  props: ["input"],
  mounted() {
    if (Object.keys(this.input).length > 0) {
      this.value = this.input["amp_switch"];
    } else {
      this.$emit("init_input", {
        amp_switch: this.value,
      });
    }
    this.init_text();
  },
  methods: {
    change() {
      const obj = {
        amp_switch: this.value,
      };
      this.$emit("init_input", obj);
      this.init_text();
    },
    // 每次改变重新计算显示文字
    init_text() {
      const str = this.options.find((val) => {
        return val.value == this.value;
      })?.label;
      this.$emit("text", str);
    },
  },
};
// 一键静音
let selector7 = {
  template: `
      <el-select v-model="value"  @change="change" style="width:120px;" size="mini">
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
      value: 1,
      options: [
        {
          label: "一键静音",
          value: 1,
        },
        {
          label: "取消静音",
          value: 0,
        },
      ],
    };
  },
  props: ["input"],
  mounted() {
    if (Object.keys(this.input).length > 0) {
      if (this.input["OUTMS"][0] === 1) {
        this.value = 1;
      } else if (this.input["OUTMS"][0] === 0) {
        this.value = 0;
      }
    } else {
      let obj = {};
      if (this.value == 1) {
        obj.OUTMS = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
      }
      if (this.value == 0) {
        obj.OUTMS = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      }
      this.$emit("init_input", obj);
    }
    this.init_text();
  },
  methods: {
    change() {
      let obj = {};
      if (this.value == 1) {
        obj.OUTMS = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
      }
      if (this.value == 0) {
        obj.OUTMS = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      }
      this.$emit("init_input", obj);
      this.init_text();
    },
    // 每次改变重新计算显示文字
    init_text() {
      const str = this.options.find((val) => {
        return val.value == this.value;
      })?.label;
      this.$emit("text", str);
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

    <selector4 class="flex_shrink" v-if="components_show(server,'selector4')"
       :input="server.serviceInputParam" @init_input="server.serviceInputParam=$event"
       @text="server.inputParamDesc=$event">
    </selector4>

    <extransrv class="flex_shrink" v-if="components_show(server,'extransrv')"
      :input="server.serviceInputParam" @init_input="server.serviceInputParam=$event"
      @text="server.inputParamDesc=$event">
    </extransrv>

    <selector5 class="flex_shrink" v-if="components_show(server,'selector5')"
       :input="server.serviceInputParam" @init_input="server.serviceInputParam=$event"
       @text="server.inputParamDesc=$event">
    </selector5>

    <selector6 class="flex_shrink" v-if="components_show(server,'selector6')"
       :input="server.serviceInputParam" @init_input="server.serviceInputParam=$event"
       @text="server.inputParamDesc=$event">
    </selector6>

    <selector7 class="flex_shrink" v-if="components_show(server,'selector7')"
       :input="server.serviceInputParam" @init_input="server.serviceInputParam=$event"
       @text="server.inputParamDesc=$event">
    </selector7>

    <el-button class="flex_shrink"
      v-if="components_show(server,'config_button')"
      @click="turn_to_page('publish',server)" round size="mini">配置</el-button>
  </div>
  `,
  components: { selector, selector2, order_control_relay, selector3, set_value, selector4, extransrv, selector5, selector6, selector7 },
  props: ["server", "turn_to_page"],
  methods: {
    // 条件渲染组件 需修改
    components_show(server, cname) {
      switch (cname) {
        case "selector":
          if (server.serviceIdentifier === "Relay_Set_State_Service" && server.productId === "1574321115531005952") {
            return true;
          }
          break;
        case "order_control_relay":
          if (server.serviceIdentifier === "Accord_Order_TO_Control_Relay_Service" && server.productId === "1574321115531005952") {
            return true;
          }
          break;
        case "selector2":
          if (server.productId === "1564171104871739392") {
            let reg = /(^SEQ\d+SRV$)|(^SEQ[A-Z]SRV$)/;
            if (reg.test(server.serviceIdentifier)) {
              return true;
            }
          }
          break;
        case "config_button":
          if (server.serviceIdentifier === "publishTask" && server.productId === "1559733901001211904") {
            return true;
          }
          break;
        case "selector3":
          if (server.serviceIdentifier === "setScreenStatus" && server.productId === "1559733901001211904") {
            server.keyword = "turnBacklight";
            return true;
          }
          break;
        case "set_value":
          if (server.serviceIdentifier === "setVolume" && server.productId === "1559733901001211904") {
            server.keyword = "volume";
            server.reg_type = "number";
            return true;
          }
          break;
        case "selector4":
          if (server.serviceIdentifier === "SCALLSRV" && server.productId === "1722147067370217472") {
            return true;
          }
          break;
        case "extransrv":
          if (server.serviceIdentifier === "EXTRANSRV" && server.productId === "1722147067370217472") {
            return true;
          }
          break;
        case "selector5":
          if (server.serviceIdentifier === "fun4_serv" && server.productId === "1681475253623779328") {
            return true;
          }
          break;
        case "selector6":
          if (server.serviceIdentifier === "amp_switch_ctrl" && server.productId === "1691711203071160320") {
            return true;
          }
          break;
        case "selector7":
          if (server.serviceIdentifier === "one_click_mute" && server.productId === "1722147067370217472") {
            return true;
          }
          break;
      }
      return false;
    },
  },
};
