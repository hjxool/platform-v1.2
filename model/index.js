let url = `${我是接口地址}/`;
let history_list_url = `${url}api-device/protocol/list/version`; // 获取历史版本列表
let version_data_url = `${url}api-device/protocol/view`; // 查看对应版本的物模型数据
let protocol_newVersion = `${url}api-device/protocol/newVersion`; // 新建物模型
let protocol_properties = `${url}api-device/protocol/properties`; // 新增物模型属性
let protocol_property = `${url}api-device/protocol/property`; // 修改物模型属性
let protocol_event = `${url}api-device/protocol/event`; // 修改物模型事件
let protocol_service = `${url}api-device/protocol/service`; // 新增修改物模型服务
let protocol_publish = `${url}api-device/protocol/publish`; // 发布物模型
let protocol_units = `${url}api-device/protocol/units`; // 查询单位
let protocol_unit_add = `${url}api-device/protocol/unit`; // 新建编辑单位
let protocol_unit_delete = `${url}api-device/protocol/delete`; // 删除单位
let product_model = `${url}api-device/product/model`; // 启用物模型
let default_property_url = `${url}api-device/protocol/property/default/list/`; // 查询默认属性列表
let limits_url = `${url}api-user/menus/current`; //获取菜单权限

Vue.config.productionTip = false;
new Vue({
	el: '#index',
	mixins: [common_functions],
	data() {
		return {
			id: '',
			token: '',
			static_params: {
				loading: false, //请求未返回时加载遮罩
				// 数据类型种类
				type_options: [
					{ value: 'int', name: 'int(整数)' },
					{ value: 'float', name: 'float(浮点型)' },
					{ value: 'double', name: 'double(双精度浮点型)' },
					{ value: 'text', name: 'text(文本)' },
					{ value: 'date', name: 'date(时间)' },
					{ value: 'struct', name: 'struct(结构体)' },
					{ value: 'array', name: 'array(数组)' },
					{ value: 'enum', name: 'enum(枚举)' },
				],
				// 数组元素类型
				array_type_options: [
					{ value: 'int', name: 'int' },
					{ value: 'float', name: 'float' },
					{ value: 'double', name: 'double' },
					{ value: 'text', name: 'text' },
					{ value: 'struct', name: 'struct' },
				],
				// 事件类型
				event_type_options: [
					{ value: 'info', name: '信息' },
					{ value: 'alert', name: '告警' },
					{ value: 'error', name: '故障' },
				],
				// 服务类型
				server_type_options: [
					{ value: 'async', name: '异步调用' },
					{ value: 'sync', name: '同步调用' },
				],
				// 枚举参数值类型
				enum_option: ['text', 'int'],
				// 单位种类
				unit_options: [],
				add_edit: '', //新建和编辑取值方式不同
				first_load: true, //第一次加载时隐藏卡片 不然会报错
				unit_set_show: false, //属性单位配置弹窗显示
				unit_add_edit: '', //区分单位编辑和新增
				unit_button_ban: true, //禁用单位相关按钮
				// 属性单位表单
				unit_paramas: {
					unit_name: '',
					symbol: '',
					type: 0,
					typeName: '',
					remarks: '',
				},
				unit_type_options: ['自定义'],
				current_version: '', //当前启用物模型版本
				model_json_display: false, //当前物模型json弹窗显示
			},
			//历史版本列表
			history_list: [],
			history_selected: '', //记录选择的是历史版本中的哪一个
			model: {}, //当前版本
			//物模型属性等列表——表格用
			protocol_list: [],
			//修改协议时的单行数据
			single_setting: {
				// id: '', //公共 id
				type: '', //功能类型
				name: '', //公共 显示名
				identifier: '', //公共 标识
				dataType: '', //公共 数据类型/事件类型/调用方式
				min: '', //属性 小
				max: '', //属性 大
				step: '', //属性 步长
				scale: 2, //属性 精度 默认2
				unit: '', //属性 单位
				size: '', //属性 数组大小
				itemType: '', //属性 数组元素类型
				enum_value_type: 'text', // 属性 枚举类型参数值类型
				textLength: '', //属性 text类型
				outputData: [], //事件/服务 属性数组
				inputData: [], //服务 属性数组
				// struct_array: [], //属性 子属性数组
			},
			// 表单数组
			form_list: [],
			// 计算点下编辑后经过了几次新增 因为新增是初始化数据结构 而编辑是找对应属性去覆写
			child_count_list: [],
			// 自定义表单验证
			rules: {
				name: { show: false, message: '' },
				identifier: { show: false, message: '' },
				textLength: { show: false, message: '' },
				size: { show: false, message: '' },
				min: { show: false, message: '' },
				max: { show: false, message: '' },
				step: { show: false, message: '' },
				unit_name: { show: false, message: '' },
				symbol: { show: false, message: '' },
				typeName: { show: false, message: '' },
				enum_list: { show: false, message: '' },
			},
			default_property: [], //默认属性列表
			current_model: '', //当前启用物模型
			config: {
				add_property_show: false,
				del_show: false,
				enable_show: false,
				create_show: false,
				publish_show: false,
				edit_show: false,
			},
		};
	},
	async mounted() {
		if (!location.search) {
			this.id = sessionStorage.id;
			this.token = sessionStorage.token;
		} else {
			this.get_token();
		}
		if (!sessionStorage.hushanwebmenuTree) {
			await new Promise((success) => {
				this.request('get', limits_url, this.token, (res) => {
					success();
					if (res.data.head.code !== 200) {
						return;
					}
					sessionStorage.hushanwebmenuTree = JSON.stringify(res.data.data.menuTree);
				});
			});
		}
		// 解析权限树
		let limits;
		for (let val of JSON.parse(sessionStorage.hushanwebmenuTree)) {
			if (val.path === '开发者中心') {
				for (let val2 of val.subMenus) {
					if (val2.path === '开发者中心_产品列表') {
						for (let val3 of val2.subMenus) {
							if (val3.path === '开发者中心_产品列表_物模型配置') {
								limits = val3.subMenus;
								break;
							}
						}
						break;
					}
				}
				break;
			}
		}
		this.config.add_property_show = this.is_element_show(limits, '添加自定义功能');
		this.config.del_show = this.is_element_show(limits, '删除');
		this.config.enable_show = this.is_element_show(limits, '启用当前物模型');
		this.config.create_show = this.is_element_show(limits, '新增版本');
		this.config.publish_show = this.is_element_show(limits, '发布上线');
		this.config.edit_show = this.is_element_show(limits, '编辑');

		// 页面第一次加载时要根据当前启用物模型查
		this.first_load = true;
		this.res_history_model(0);
		this.get_unit();
		this.get_default_property();
	},
	methods: {
		// 解析权限树
		is_element_show(source, key) {
			for (let val of source) {
				let t = val.path.split('_');
				if (t[t.length - 1] === key) {
					return true;
				}
			}
			return false;
		},
		// 页面加载时历史版本
		res_history_model(index) {
			this.request('get', `${history_list_url}?productId=${this.id}`, this.token, (res) => {
				// 加载完毕后再显示底部卡片
				if (res.data.head.code !== 200) {
					this.$message.info('无历史数据');
					return;
				}
				this.static_params.first_load = false;
				this.history_list = res.data.data;
				this.search_current_model();
				this.model_select(this.first_load ? this.history_selected : index);
				this.first_load = false;
			});
		},
		// 选择查看版本
		model_select(index) {
			// 构造表格数据 只展示第一层
			this.protocol_list = [];
			this.history_selected = index;
			this.model_id = this.history_list[index].modelId;
			this.get_version_data();
		},
		// 根据版本查对应物模型
		get_version_data() {
			this.request('get', `${version_data_url}/${this.model_id}`, this.token, (res) => {
				if (res.data.head.code !== 200) {
					return;
				}
				this.model = res.data.data;
				this.current_model = JSON.stringify(this.model, null, 4);
				// 不需要记录id等不展示的属性，只需要能点编辑时找到在数组中位置
				this.model.events.forEach((e) => {
					let table = {
						id: e.eventId,
						type: '事件',
						name: e.name,
						identifier: e.identifier,
						dataType_text: `事件类型：${e.type == 'info' ? '信息' : e.type == 'alert' ? '告警' : '故障'}`,
						dataType: e.type,
						outputData: e.outputData == null ? [] : e.outputData,
					};
					this.protocol_list.push(table);
				});
				this.model.services.forEach((e) => {
					let table = {
						id: e.serviceId,
						type: '服务',
						name: e.name,
						identifier: e.identifier,
						dataType_text: `调用方式：${e.method == 'async' ? '异步调用' : '同步调用'}`,
						dataType: e.method,
						inputData: e.inputData == null ? [] : e.inputData,
						outputData: e.outputData == null ? [] : e.outputData,
					};
					this.protocol_list.push(table);
				});
				this.model.properties.forEach((e) => {
					let table = {
						id: e.propertyId,
						type: '属性',
						name: e.name,
						identifier: e.identifier,
						dataType_text: `数据类型：${e.dataType.type}`,
						dataType: e.dataType.type,
					};
					if (e.dataType.type == 'text') {
						table.textLength = e.dataType.specs.length;
					} else if (e.dataType.type == 'date') {
					} else if (e.dataType.type == 'struct') {
						// 这地方存的是源数据 在点编辑查看时要特殊处理 取值赋给展示数据
						table.struct_array = e.dataType.properties;
					} else if (e.dataType.type == 'array') {
						table.itemType = e.dataType.specs.item.type;
						table.size = e.dataType.specs.size;
						if (table.itemType == 'struct') {
							table.struct_array = e.dataType.specs.item.properties;
						}
					} else if (e.dataType.type == 'enum') {
						table.enum_list = [];
						table.enum_value_type = e.dataType.specs.enumType || 'text'; // 枚举类型的参数值类型
						for (let key in e.dataType.specs.enumValue) {
							let t = { value: key, label: e.dataType.specs.enumValue[key] };
							table.enum_list.push(t);
						}
					} else {
						table.min = e.dataType.specs.min;
						table.max = e.dataType.specs.max;
						table.step = e.dataType.specs.step;
						table.unit = e.dataType.specs.unitName == null ? '' : `${e.dataType.specs.unitName} / ${e.dataType.specs.unit}`;
						table.scale = e.dataType.specs.scale || e.dataType.specs.scale === 0 ? 0 : 2;
					}
					this.protocol_list.push(table);
				});
			});
		},
		// 新建物模型
		async new_ver_model() {
			//#region
			// then实现
			// this.$prompt('请输入新物模型版本号', '提示', {
			// 	confirmButtonText: '确定',
			// 	cancelButtonText: '取消',
			// 	inputPattern: /.{1,16}/,
			// 	inputErrorMessage: '不能为空且最多16个字符！',
			// })
			// 	.then((res) => {
			// 		return this.$confirm('确认以当前所选物模型版本新建物模型？', '提示', {
			// 			confirmButtonText: '确定',
			// 			cancelButtonText: '取消',
			// 			type: 'info',
			// 			center: true,
			// 		}).catch(() => false);
			// 	})
			// 	.then(({ value }) => {
			// 		let data = model;
			// 		data.profile.versionAlias = value;
			// 		this.request('post', protocol_newVersion, this.token, data, (res) => {
			// 			if (res.data.head.code !== 200) {
			// 				this.$message.error('新建物模型失败');
			// 				return;
			// 			}
			// 			this.res_history_model(0)
			// 		});
			// 	})
			// 	.catch(() => false);
			//#endregion
			// await实现
			let r1 = await this.$prompt('请输入新物模型版本号', '提示', {
				confirmButtonText: '确定',
				cancelButtonText: '取消',
				inputPattern: /.{1,16}/,
				inputErrorMessage: '不能为空且最多16个字符！',
			}).catch(() => false);
			if (!r1) {
				return;
			}
			let r2 = await this.$confirm('确认以当前所选物模型版本新建物模型？', '提示', {
				confirmButtonText: '确定',
				cancelButtonText: '取消',
				type: 'info',
				center: true,
			}).then(
				() => true,
				() => false
			);
			if (!r2) {
				return;
			}
			let data = this.model;
			data.profile.versionAlias = r1.value;
			this.request('post', protocol_newVersion, this.token, data, (res) => {
				if (res.data.head.code !== 200) {
					this.$message.error('新建物模型失败');
					return;
				}
				this.res_history_model(this.history_selected);
			});
		},
		// 编辑查看模型中单条数据
		edit_protocol(row_data) {
			// protocol_list中每一行数据
			console.log(row_data);
			this.static_params.add_edit = 'edit';
			let count = 0;
			this.child_count_list.push(count);
			// 不要将展示页面和真实数据直接关联 修改完返回模板数据修改真实数据
			let temp = {};
			for (let key in this.single_setting) {
				if (key != 'inputData' && key != 'outputData') {
					temp[key] = this.single_setting[key];
				}
				if (row_data[key] != undefined) {
					temp[key] = row_data[key];
				}
			}
			// 给form_list数据增加id便于取消操作数据回滚
			if (row_data.id != undefined && row_data.id != '') {
				temp.id = row_data.id;
			}
			// 因为数组是对象有索引 修改父级数组后，模板中数组指针也永远改变了，所以每一层看的都是同样的数组
			if (row_data.struct_array != undefined) {
				temp.struct_array = JSON.parse(JSON.stringify(row_data.struct_array));
				// 还需要准备一个临时的深拷贝响应数组，当取消删除操作时，用此临时数据替换源数组
				// 在准备好的数组push前，声明的非响应式数据在push之后都会变成响应式
				// temp.struct_array_replace = [];
				// this.copy_struct_array(temp.struct_array_replace, row_data.struct_array);
			}
			if (row_data.enum_list != undefined) {
				temp.enum_list = JSON.parse(JSON.stringify(row_data.enum_list));
				temp.enum_value_type = row_data.enum_value_type;
			}
			this.form_list.push(temp);
			this.$nextTick(() => {
				let dom = this.$refs.custom_center[0];
				dom.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
			});
		},
		// 删除属性等协议
		delete_protocol(row_data) {
			console.log(row_data);
			this.$confirm(`此操作将删除当前${row_data.type}`, '提示', {
				confirmButtonText: '确定',
				cancelButtonText: '取消',
				type: 'info',
				center: true,
			})
				.then(() => {
					switch (row_data.type) {
						case '属性':
							this.model.properties.forEach((e) => {
								if (e.propertyId == row_data.id) {
									this.request('delete', `${protocol_property}/${e.propertyId}`, this.token, () => {
										this.model_select(this.history_selected);
									});
								}
							});
							break;
						case '事件':
							this.model.events.forEach((e) => {
								if (e.eventId == row_data.id) {
									this.request('delete', `${protocol_event}/${this.model_id}/${e.eventId}`, this.token, () => {
										this.model_select(this.history_selected);
									});
								}
							});
							break;
						case '服务':
							this.model.services.forEach((e) => {
								if (e.serviceId == row_data.id) {
									this.request('delete', `${protocol_service}/${this.model_id}/${e.serviceId}`, this.token, () => {
										this.model_select(this.history_selected);
									});
								}
							});
							break;
					}
				})
				.catch(() => {
					this.$message.info('已取消操作');
				});
		},
		// 已发布后查看物模型
		check_protocol(row_data) {
			console.log(row_data);
			this.static_params.add_edit = 'check';
			let temp = {};
			for (let key in this.single_setting) {
				if (key != 'inputData' && key != 'outputData') {
					temp[key] = this.single_setting[key];
				}
				if (row_data[key] != undefined) {
					temp[key] = row_data[key];
				}
			}
			if (row_data.struct_array != undefined) {
				temp.struct_array = row_data.struct_array;
			}
			if (row_data.enum_list != undefined) {
				temp.enum_list = JSON.parse(JSON.stringify(row_data.enum_list));
			}
			this.form_list.push(temp);
		},
		// 编辑子属性
		edit_child_json(row_data, child_index) {
			// 跟表格编辑查看不同的地方在于，表格数据是提取出来的，而子属性列表里的是原始格式数据
			console.log(row_data);
			// this.static_params.add_edit = 'edit_child';
			let count = 0;
			this.child_count_list.push(count);
			let temp = {};
			for (let key in this.single_setting) {
				if (key != 'inputData' && key != 'outputData') {
					temp[key] = this.single_setting[key];
				}
			}
			temp.inputData = [];
			temp.outputData = [];
			temp.type = '属性';
			//第一层数据因为是从protocol_list取值，所以索引无用不如id，但是里层嵌套的数组用索引取值更好
			temp.index = child_index;
			if (row_data.propertyId != undefined && row_data.propertyId != '') {
				temp.id = row_data.propertyId;
			}
			temp.identifier = row_data.identifier;
			temp.name = row_data.name;
			temp.dataType = row_data.dataType.type;
			switch (temp.dataType) {
				case 'text':
					temp.textLength = row_data.dataType.specs.length;
					break;
				case 'date':
					break;
				case 'struct':
					temp.struct_array = row_data.dataType.properties;
					// temp.struct_array_replace = [];
					// this.copy_struct_array(temp.struct_array_replace, row_data.dataType.properties);
					break;
				case 'array':
					temp.itemType = row_data.dataType.specs.item.type;
					temp.size = row_data.dataType.specs.size;
					if (temp.itemType == 'struct') {
						temp.struct_array = row_data.dataType.specs.item.properties;
						// temp.struct_array_replace = [];
						// this.copy_struct_array(temp.struct_array_replace, row_data.dataType.specs.item.properties);
					}
					break;
				case 'enum':
					temp.enum_list = [];
					temp.enum_value_type = row_data.dataType.specs.enumType || 'text';
					for (let key in row_data.dataType.specs.enumValue) {
						let t = { value: key, label: row_data.dataType.specs.enumValue[key] };
						temp.enum_list.push(t);
					}
					break;
				default:
					temp.min = row_data.dataType.specs.min;
					temp.max = row_data.dataType.specs.max;
					temp.step = row_data.dataType.specs.step;
					temp.unit = row_data.dataType.specs.unitName == null ? '' : `${row_data.dataType.specs.unitName} / ${row_data.dataType.specs.unit}`;
					temp.scale = row_data.dataType.specs.scale || row_data.dataType.specs.scale === 0 ? 0 : 2;
					break;
			}
			this.form_list.push(temp);
		},
		// 删除子属性
		del_child_json(parent, child_index) {
			parent.struct_array.splice(child_index, 1);
			// this.$confirm(`此操作不可逆，删除后需刷新页面重新获取数据`, '提示', {
			// 	confirmButtonText: '确定',
			// 	cancelButtonText: '取消',
			// 	type: 'info',
			// 	center: true,
			// }).then(() => {
			// 	parent.struct_array.splice(child_index, 1);
			// });
		},
		// 发布后查看子属性
		check_child_json(row_data) {
			let temp = {};
			for (let key in this.single_setting) {
				if (key != 'inputData' && key != 'outputData') {
					temp[key] = this.single_setting[key];
				}
			}
			temp.inputData = [];
			temp.outputData = [];
			temp.type = '属性';
			temp.identifier = row_data.identifier;
			temp.name = row_data.name;
			temp.dataType = row_data.dataType.type;
			switch (temp.dataType) {
				case 'text':
					temp.textLength = row_data.dataType.specs.length;
					break;
				case 'date':
					break;
				case 'struct':
					temp.struct_array = row_data.dataType.properties;
					break;
				case 'array':
					temp.itemType = row_data.dataType.specs.item.type;
					temp.size = row_data.dataType.specs.size;
					if (temp.itemType == 'struct') {
						temp.struct_array = row_data.dataType.specs.item.properties;
					}
					break;
				case 'enum':
					temp.enum_list = [];
					for (let key in row_data.dataType.specs.enumValue) {
						let t = { value: key, label: row_data.dataType.specs.enumValue[key] };
						temp.enum_list.push(t);
					}
					break;
				default:
					temp.min = row_data.dataType.specs.min;
					temp.max = row_data.dataType.specs.max;
					temp.step = row_data.dataType.specs.step;
					temp.unit = row_data.dataType.specs.unitName == null ? '' : `${row_data.dataType.specs.unitName} / ${row_data.dataType.specs.unit}`;
					temp.scale = row_data.dataType.specs.scale || row_data.dataType.specs.scale === 0 ? 0 : 2;
					break;
			}
			this.form_list.push(temp);
		},
		// 添加自定义功能按钮
		add_protocol() {
			this.static_params.add_edit = 'add';
			let count = 0;
			this.child_count_list.push(count);
			let temp = {};
			for (let key in this.single_setting) {
				if (key != 'inputData' && key != 'outputData') {
					temp[key] = this.single_setting[key];
				}
			}
			temp.inputData = [];
			temp.outputData = [];
			temp.type = '属性';
			temp.dataType = 'int';
			// 数组要独一份创建
			// temp.struct_array = [];
			this.form_list.push(temp);
			this.$nextTick(() => {
				let dom = this.$refs.custom_center[0];
				dom.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
			});
		},
		// 迭代清空对象
		clean_object(obj) {
			if (obj.constructor === Array && typeof obj[0] != 'object') {
				obj = [];
			} else if (obj.constructor === Array && typeof obj[0] === 'object') {
				for (let item of obj) {
					this.clean_object(item);
				}
			} else if (obj.constructor === Object) {
				for (let key in obj) {
					if (typeof obj[key] != 'object') {
						obj[key] = '';
					} else {
						this.clean_object(obj[key]);
					}
				}
			}
		},
		// 表单手动验证
		form_verify(value, flag, compare) {
			compare == undefined ? (compare = '') : compare;
			this.rules[flag].show = true;
			let reg;
			switch (flag) {
				case 'name':
					reg = /^[\u4E00-\u9FA5A-Za-z0-9_]+$/;
					if (!reg.test(value)) {
						this.rules[flag].message = '不能为空或者输入特殊字符';
						return false;
					}
					break;
				case 'identifier':
					reg = /^\w+$/;
					if (!reg.test(value)) {
						this.rules[flag].message = '不能为空或者输入特殊字符';
						return false;
					}
					break;
				case 'textLength':
					reg = /^\d+$/;
					if (!reg.test(value)) {
						this.rules[flag].message = '只能输入数字';
						return false;
					}
					break;
				case 'size':
					reg = /^[1-9][0-9]{0,4}$/;
					if (!reg.test(value)) {
						this.rules[flag].message = '不能为空且只能输入5位以内非0开头的整数数字';
						return false;
					}
					break;
				case 'max':
					if (Number(value) < Number(compare)) {
						this.$message.error('不能小于最小值');
						return false;
					}
					break;
				case 'unit_name':
					reg = /^[\u4E00-\u9FA5A-Za-z0-9_]+$/;
					if (!reg.test(value)) {
						this.rules[flag].message = '不能为空或者输入特殊字符';
						return false;
					}
					for (let obj of this.static_params.unit_options) {
						for (let item of obj.options) {
							if (value == item.name && value != compare) {
								this.rules[flag].message = '跟已有单位重名';
								return false;
							}
						}
					}
					break;
				case 'typeName':
					reg = /^.{1,}$/;
					if (!reg.test(value)) {
						this.rules[flag].message = '不能为空';
						return false;
					}
					for (let obj of this.static_params.unit_options) {
						if (value == obj.label && value != compare) {
							this.rules[flag].message = '跟已有类型重名';
							return false;
						}
					}
					break;
				case 'enum_list':
					if (value[flag].length) {
						reg = /^[\u4E00-\u9FA5A-Za-z0-9_]+$/;
						let type = value.enum_value_type;
						for (let val of value[flag]) {
							if (!reg.test(val.value) || !reg.test(val.label)) {
								this.rules[flag].message = '枚举项不能为空';
								return false;
							}
							if (type === 'int' && isNaN(Number(val.value))) {
								this.rules[flag].message = '参数值类型不匹配';
								return false;
							}
						}
					} else {
						this.rules[flag].message = '不能为空';
						return false;
					}
					break;
				default:
					reg = /^.{1,}$/;
					if (!reg.test(value)) {
						this.rules[flag].message = '不能为空';
						return false;
					}
					break;
			}
			this.rules[flag].show = false;
			return true;
		},
		// 提交表单
		submit_form(obj, index) {
			console.log('提交表单', obj);
			// 提交按钮传入的是form_list里的数据
			let result = [];
			result.push(this.form_verify(obj.name, 'name'));
			result.push(this.form_verify(obj.identifier, 'identifier'));
			if (obj.dataType == 'int' || obj.dataType == 'float' || obj.dataType == 'double') {
				result.push(this.form_verify(obj.max, 'max', obj.min));
			}
			if (obj.dataType == 'text') {
				result.push(this.form_verify(obj.textLength, 'textLength'));
			}
			if (obj.dataType == 'struct' || obj.itemType == 'struct') {
				result.push(obj.struct_array.length > 0);
			}
			if (obj.dataType == 'array') {
				result.push(this.form_verify(obj.size, 'size'));
			}
			if (obj.dataType == 'enum') {
				result.push(this.form_verify(obj, 'enum_list'));
			}
			for (let value of result) {
				if (!value) {
					return;
				}
			}
			// 先判断是否已经到了最近的编辑层,如果还没到，则往上一层级新增格式化数据
			if (this.child_count_list[this.child_count_list.length - 1] > 0) {
				let temp = this.format_params(obj);
				this.form_list[index - 1].struct_array.push(temp);
				this.form_list.pop();
				this.child_count_list[this.child_count_list.length - 1]--;
			} else {
				// 如果已经到了最近的编辑层 再判断是否是最外层的编辑或新增功能 同时删除后一个计数器
				if (this.form_list.length > 1) {
					// 在编辑和新增里 如果未到最外层这一部分是公共逻辑 进行的是往上找 修改上一层级数据
					// 其实也可以修改成将当前表单编辑的数据格式化 再替换上一层struct_array里对应的元素对象
					let array = this.form_list[index - 1].struct_array;
					array.splice(obj.index, 1, this.format_params(obj));
					// array[obj.index].name = obj.name;
					// array[obj.index].identifier = obj.identifier;
					// array[obj.index].dataType.type = obj.dataType;
					// if (array[obj.index].dataType.specs != null) {
					// 	if (array[obj.index].dataType.specs.item != null) {
					// 		array[obj.index].dataType.specs.item.properties = [];
					// 	}
					// }
					// array[obj.index].dataType.properties = [];
					// switch (obj.dataType) {
					// 	case 'text':
					// 		// 如果原先数据是date等 specs就是null不能直接添加属性 而要用新对象直接覆盖
					// 		// 而且本来specs里就没有什么固定内容
					// 		array[obj.index].dataType.specs = { length: obj.textLength };
					// 		break;
					// 	case 'date':
					// 		break;
					// 	case 'struct':
					// 		for (let i of obj.struct_array) {
					// 			array[obj.index].dataType.properties.push(i);
					// 		}
					// 		break;
					// 	case 'array':
					// 		array[obj.index].dataType.specs = {
					// 			size: obj.size,
					// 			item: { type: obj.itemType },
					// 		};
					// 		array[obj.index].dataType.specs.item.properties = [];
					// 		if (obj.itemType == 'struct') {
					// 			for (let i of obj.struct_array) {
					// 				array[obj.index].dataType.specs.item.properties.push(i);
					// 			}
					// 		}
					// 		break;
					// 	case 'enum':
					// 		array[obj.index].dataType.specs = { enumValue: {}, enumType: obj.enum_value_type };
					// 		for (let val of obj.enum_list) {
					// 			array[obj.index].dataType.specs.enumValue[val.value] = val.label;
					// 		}
					// 		break;
					// 	default:
					// 		array[obj.index].dataType.specs = {
					// 			min: obj.min == '' ? 0 : obj.min,
					// 			max: obj.max == '' ? 0 : obj.max,
					// 			step: obj.step == '' ? 0 : obj.step,
					// 			unitName: obj.unit.split(' / ')[0] == '' ? null : obj.unit.split(' / ')[0],
					// 			unit: obj.unit.split(' / ')[0] == '' ? null : obj.unit.split(' / ')[1],
					// 			scale: obj.scale,
					// 		};
					// 		break;
					// }
					// 修改完后关闭一层表单
					this.form_list.pop();
					this.child_count_list.pop();
				} else {
					// 此时只有一个表单 就要开始区分是编辑还是新增功能
					if (this.static_params.add_edit === 'add') {
						let temp;
						switch (obj.type) {
							case '属性':
								let property = this.format_params(obj);
								temp = {
									modelId: this.model_id,
									properties: [property],
								};
								this.request('post', protocol_properties, this.token, temp, () => {
									this.model_select(this.history_selected);
									this.form_list = [];
									this.child_count_list.pop();
								});
								break;
							case '事件':
								temp = {
									modelId: this.model_id,
									events: [
										{
											identifier: obj.identifier,
											name: obj.name,
											type: obj.dataType,
											outputData: obj.outputData || [],
										},
									],
								};
								this.request('post', protocol_event, this.token, temp, () => {
									this.model_select(this.history_selected);
									this.form_list = [];
									this.child_count_list.pop();
								});
								break;
							case '服务':
								temp = {
									modelId: this.model_id,
									services: [
										{
											identifier: obj.identifier,
											name: obj.name,
											method: obj.dataType,
											inputData: obj.inputData || [],
											outputData: obj.outputData || [],
										},
									],
								};
								this.request('post', protocol_service, this.token, temp, () => {
									this.model_select(this.history_selected);
									this.form_list = [];
									this.child_count_list.pop();
								});
								break;
						}
					} else if (this.static_params.add_edit === 'edit') {
						switch (obj.type) {
							case '属性':
								for (let e of this.model.properties) {
									if (e.propertyId === obj.id) {
										e.name = obj.name;
										e.identifier = obj.identifier;
										e.dataType.type = obj.dataType;
										if (e.dataType.specs != null) {
											if (e.dataType.specs.item != null) {
												e.dataType.specs.item.properties = [];
											}
										}
										e.dataType.properties = [];
										switch (obj.dataType) {
											case 'text':
												e.dataType.specs = { length: obj.textLength };
												break;
											case 'date':
												break;
											case 'struct':
												for (let i of obj.struct_array) {
													e.dataType.properties.push(i);
												}
												break;
											case 'array':
												e.dataType.specs = {
													size: obj.size,
													item: { type: obj.itemType },
												};
												e.dataType.specs.item.properties = [];
												if (obj.itemType == 'struct') {
													for (let i of obj.struct_array) {
														e.dataType.specs.item.properties.push(i);
													}
												}
												break;
											case 'enum':
												e.dataType.specs = { enumValue: {}, enumType: obj.enum_value_type };
												for (let val of obj.enum_list) {
													e.dataType.specs.enumValue[val.value] = val.label;
												}
												break;
											default:
												e.dataType.specs = {
													min: obj.min == '' ? 0 : obj.min,
													max: obj.max == '' ? 0 : obj.max,
													step: obj.step == '' ? 0 : obj.step,
													unitName: obj.unit.split(' / ')[0] == '' ? null : obj.unit.split(' / ')[0],
													unit: obj.unit.split(' / ')[0] == '' ? null : obj.unit.split(' / ')[1],
													scale: obj.scale || obj.scale === 0 ? 0 : 2,
												};
												break;
										}
										this.request('put', protocol_property, this.token, e, () => {
											this.model_select(this.history_selected);
											this.form_list = [];
											this.child_count_list.pop();
										});
										break;
									}
								}
								break;
							case '事件':
								for (let e of this.model.events) {
									if (e.eventId == obj.id) {
										e.identifier = obj.identifier;
										e.name = obj.name;
										e.type = obj.dataType;
										e.outputData = obj.outputData || [];
										this.request('put', `${protocol_event}/${this.model_id}`, this.token, e, () => {
											this.model_select(this.history_selected);
											this.form_list = [];
											this.child_count_list.pop();
										});
										break;
									}
								}
								break;
							case '服务':
								for (let e of this.model.services) {
									if (e.serviceId == obj.id) {
										e.identifier = obj.identifier;
										e.name = obj.name;
										e.method = obj.dataType;
										e.inputData = obj.inputData || [];
										e.outputData = obj.outputData || [];
										this.request('put', `${protocol_service}/${this.model_id}`, this.token, e, () => {
											this.model_select(this.history_selected);
											this.form_list = [];
											this.child_count_list.pop();
										});
										break;
									}
								}
								break;
						}
					}
				}
			}
		},
		// 根据传入的数据构造可发送的参数格式
		format_params(obj) {
			let dataType = {
				type: obj.dataType,
			};
			switch (obj.dataType) {
				case 'text':
					dataType.specs = { length: obj.textLength };
					break;
				case 'date':
					break;
				case 'struct':
					dataType.properties = [];
					if (obj.struct_array.length > 0) {
						for (let i of obj.struct_array) {
							dataType.properties.push(i);
						}
					} else {
						return;
					}
					break;
				case 'array':
					dataType.specs = {
						size: obj.size,
						item: { type: obj.itemType },
					};
					if (obj.itemType == 'struct') {
						dataType.specs.item.properties = [];
						if (obj.struct_array.length > 0) {
							for (let i of obj.struct_array) {
								dataType.specs.item.properties.push(i);
							}
						} else {
							return;
						}
					}
					break;
				case 'enum':
					dataType.specs = { enumValue: {}, enumType: obj.enum_value_type };
					for (let val of obj.enum_list) {
						dataType.specs.enumValue[val.value] = val.label;
					}
					break;
				default:
					dataType.specs = {
						min: obj.min == '' ? 0 : obj.min,
						max: obj.max == '' ? 0 : obj.max,
						step: obj.step == '' ? 0 : obj.step,
						unitName: obj.unit.split(' / ')[0] == '' ? null : obj.unit.split(' / ')[0],
						unit: obj.unit.split(' / ')[0] == '' ? null : obj.unit.split(' / ')[1],
						scale: obj.scale || obj.scale === 0 ? 0 : 2,
					};
					break;
			}
			let temp = {
				identifier: obj.identifier,
				name: obj.name,
				dataType: dataType,
			};
			if (obj.id != null && obj.id != '') {
				temp.propertyId = obj.id;
			}
			return temp;
		},
		// 切换数据类型时构造不同的参数
		format_type_data(obj) {
			if (obj.dataType == 'struct' || obj.dataType == 'array') {
				if (obj.struct_array == undefined) {
					this.$set(obj, 'struct_array', []);
				}
				if (obj.itemType == '' || obj.itemType == null) {
					obj.itemType = 'int';
				}
			} else if (obj.dataType == 'enum' && obj.enum_list == undefined) {
				this.$set(obj, 'enum_list', []);
			}
			this.clean_verify();
		},
		// 格式化数组元素类型
		format_array_data(obj) {
			// 传入的是form_list对象
			if (obj.itemType == 'struct') {
				if (obj.struct_array == undefined) {
					this.$set(obj, 'struct_array', []);
				}
			}
		},
		// 增加子属性
		add_child_property() {
			// this.static_params.add_edit = 'child';
			this.child_count_list[this.child_count_list.length - 1]++;
			let temp = {};
			for (let key in this.single_setting) {
				if (key != 'inputData' && key != 'outputData') {
					temp[key] = this.single_setting[key];
				}
			}
			temp.inputData = [];
			temp.outputData = [];
			temp.type = '属性';
			temp.dataType = 'int';
			this.form_list.push(temp);
			this.clean_verify();
		},
		// 增加枚举项
		add_enum(obj) {
			let t = {
				value: '',
				label: '',
			};
			obj.enum_list.push(t);
		},
		// 删除枚举项
		del_enum(obj) {
			obj.enum_list.pop();
		},
		// 发布物模型
		publish_model() {
			this.$confirm('一经发布不能再修改，确认发布？', '提示', {
				confirmButtonText: '确定',
				cancelButtonText: '取消',
				type: 'info',
				center: true,
			}).then(() => {
				this.request('get', `${protocol_publish}/${this.model_id}`, this.token, () => {
					this.res_history_model(this.history_selected);
				});
			});
		},
		// 点击下拉框获取远程数据
		get_unit() {
			this.static_params.unit_type_options = ['自定义'];
			this.request('get', protocol_units, this.token, (res) => {
				this.static_params.unit_options = [];
				for (let [key, array] of Object.entries(res.data.data)) {
					let temp = {
						label: key,
						options: [],
					};
					for (let item of array) {
						let unit = {
							value: `${item.name} / ${item.symbol}`,
						};
						for (let key in item) {
							unit[key] = item[key];
						}
						temp.options.push(unit);
					}
					this.static_params.unit_options.push(temp);
					this.static_params.unit_type_options.push(key);
				}
			});
		},
		// 新增单位
		add_unit() {
			this.static_params.unit_add_edit = 'add';
			this.static_params.unit_set_show = true;
		},
		// 编辑单位
		edit_unit() {
			let t_name = this.form_list[this.form_list.length - 1].unit.split(' / ')[0];
			for (let v1 of this.static_params.unit_options) {
				for (let v2 of v1.options) {
					if (t_name == v2.name) {
						this.static_params.unit_paramas.unitId = v2.unitId;
						this.static_params.unit_paramas.unit_name = v2.name;
						this.static_params.unit_paramas.name_old = v2.name;
						this.static_params.unit_paramas.remarks = v2.remarks;
						this.static_params.unit_paramas.symbol = v2.symbol;
						this.static_params.unit_paramas.type = v2.type;
						if (v2.type == 0) {
							this.static_params.unit_paramas.typeName = v2.typeName;
							this.static_params.unit_paramas.typeName_old = v2.typeName;
						}
					}
				}
			}
			this.static_params.unit_add_edit = 'edit';
			this.static_params.unit_set_show = true;
		},
		// 删除单位
		del_unit() {
			this.static_params.loading = true;
			let t_name = this.form_list[this.form_list.length - 1].unit.split(' / ')[0];
			for (let v1 of this.static_params.unit_options) {
				for (let v2 of v1.options) {
					if (t_name == v2.name) {
						this.request('delete', `${protocol_unit_delete}/${v2.unitId}`, this.token, () => {
							this.get_unit();
							this.static_params.loading = false;
						});
					}
				}
			}
		},
		// 单位弹窗提交
		unit_submit() {
			let result = [];
			result.push(this.form_verify(this.static_params.unit_paramas.unit_name, 'unit_name', this.static_params.unit_paramas.name_old));
			result.push(this.form_verify(this.static_params.unit_paramas.symbol, 'symbol'));
			if (this.static_params.unit_paramas.type == 0) {
				result.push(this.form_verify(this.static_params.unit_paramas.typeName, 'typeName', this.static_params.unit_paramas.typeName_old));
			}
			for (let value of result) {
				if (!value) {
					return;
				}
			}
			this.static_params.loading = true;
			let t = {
				name: this.static_params.unit_paramas.unit_name,
				symbol: this.static_params.unit_paramas.symbol,
				type: Number(this.static_params.unit_paramas.type),
				remarks: this.static_params.unit_paramas.remarks,
			};
			if (t.type == 0) {
				t.typeName = this.static_params.unit_paramas.typeName;
			}
			if (this.static_params.unit_add_edit == 'add') {
				this.request('post', protocol_unit_add, this.token, t, () => {
					this.get_unit();
					this.clean_verify();
					this.clean_object(this.static_params.unit_paramas);
					this.static_params.unit_paramas.type = 0;
					this.static_params.unit_set_show = false;
					this.static_params.loading = false;
				});
			} else {
				t.unitId = this.static_params.unit_paramas.unitId;
				this.request('put', protocol_unit_add, this.token, t, () => {
					this.get_unit();
					this.clean_verify();
					this.clean_object(this.static_params.unit_paramas);
					this.static_params.unit_paramas.type = 0;
					this.static_params.unit_set_show = false;
					this.static_params.loading = false;
				});
			}
		},
		// 单位弹窗取消
		unit_cancel() {
			this.clean_verify();
			this.clean_object(this.static_params.unit_paramas);
			this.static_params.unit_paramas.type = 0;
			this.static_params.unit_set_show = false;
		},
		// 清空表单 并设置初始值
		clean_form(obj) {
			for (let key in obj) {
				if (key != 'type') {
					obj[key] = '';
				}
			}
			switch (obj.type) {
				case '属性':
					obj.dataType = 'int';
					break;
				case '事件':
					obj.dataType = 'info';
					break;
				case '服务':
					obj.dataType = 'async';
					break;
			}
			this.clean_verify();
		},
		// 点击取消时删除卡片数组最后一个
		del_form(obj) {
			// 传入的是form_list数据
			this.form_list.pop();
			if (this.child_count_list[this.child_count_list.length - 1] > 0) {
				--this.child_count_list[this.child_count_list.length - 1];
			} else {
				this.child_count_list.pop();
			}
			this.clean_verify();
		},
		// 当前编辑弹窗消失时 清除验证提示
		clean_verify() {
			for (let key in this.rules) {
				this.rules[key].show = false;
			}
		},
		// 当选择的是系统单位时禁止删除和更新按钮
		ban_unit_button() {
			this.static_params.unit_button_ban = false;
			let t_name = this.form_list[this.form_list.length - 1].unit.split(' / ')[0];
			for (let v1 of this.static_params.unit_options) {
				for (let v2 of v1.options) {
					if (t_name == v2.name) {
						if (v2.sysDefault == 1) {
							this.static_params.unit_button_ban = true;
							return;
						}
					}
				}
			}
		},
		// 精度分类
		precision_sort(obj) {
			switch (obj.dataType) {
				case 'int':
					return 0;
				case 'float':
				case 'double':
					return obj.scale;
			}
		},
		// 步长分类
		step_sort(obj) {
			switch (obj.dataType) {
				case 'int':
					return 1;
				case 'float':
				case 'double':
					return Math.pow(0.1, obj.scale);
			}
		},
		// 启用当前物模型
		set_product_model() {
			this.request('put', `${product_model}/${this.id}/${this.model_id}`, this.token, (res) => {
				if (res.data.head.code !== 200) {
					this.$message.error('操作失败');
					return;
				}
				this.$message.success('操作成功');
				this.res_history_model(this.history_selected);
			});
		},
		// 页面加载时查询启用物模型版本
		search_current_model() {
			let flag = false;
			let index = 0;
			for (let val of this.history_list) {
				if (val.profile.isCurrentVersion == '1') {
					this.history_selected = index;
					this.static_params.current_version = `${val.profile.versionAlias || '默认'} (${val.profile.version})`;
					flag = true;
					break;
				}
				index++;
			}
			if (!flag) {
				this.static_params.current_version = '未设置启用模型';
			}
		},
		//获取默认属性列表
		get_default_property() {
			this.request('post', default_property_url, this.token, (res) => {
				console.log('默认属性', res);
				if (res.data.head.code != 200) {
					return;
				}
				this.default_property = res.data.data;
			});
		},
		// 查询默认属性
		property_search(search, callback) {
			let result = search ? this.default_property.filter(this.property_search_filter(search)) : this.default_property;
			callback(result);
		},
		// 过滤器回调
		property_search_filter(search) {
			return (e) => {
				return e.name.toLowerCase().indexOf(search.toLowerCase()) != -1;
			};
		},
		// 选中默认推荐属性后修改表单参数
		init_default_property(select_obj, form_obj) {
			form_obj.name = select_obj.name;
			form_obj.identifier = select_obj.identifier;
			form_obj.dataType = select_obj.dataType.type;
			switch (form_obj.dataType) {
				case 'text':
					form_obj.textLength = select_obj.dataType.specs.length;
					break;
				case 'date':
					break;
				case 'struct':
					form_obj.struct_array = JSON.parse(JSON.stringify(select_obj.dataType.properties));
					break;
				case 'array':
					form_obj.size = select_obj.dataType.specs.size;
					form_obj.itemType = select_obj.dataType.specs.item.type;
					if (form_obj.itemType == 'struct') {
						form_obj.struct_array = JSON.parse(JSON.stringify(select_obj.dataType.specs.item.properties));
					}
					break;
				default:
					form_obj.min = select_obj.dataType.specs.min || 0;
					form_obj.max = select_obj.dataType.specs.max || 0;
					form_obj.step = select_obj.dataType.specs.step || 0;
					form_obj.unit = `${select_obj.dataType.specs.unitName} / ${select_obj.dataType.specs.unit}`;
					form_obj.scale = select_obj.dataType.specs.scale || select_obj.dataType.specs.scale === 0 ? 0 : 2;
					break;
			}
			this.form_verify(form_obj.name, 'name');
		},
		// 复制内容到剪贴板
		//#region
		// copy(content) {
		// 	let t = document.createElement('textarea');
		// 	t.innerText = content;
		// 	document.body.appendChild(t);
		// 	t.select();
		// 	document.execCommand('copy');
		// 	document.body.removeChild(t);
		// 	this.$message.success('已复制到剪贴板');
		// },
		//#endregion
		// 导出JSON
		save_to_local(content) {
			let { schema, profile, properties, events, services } = JSON.parse(content);
			let c = JSON.stringify({ schema, profile, properties, events, services });
			let blob = new Blob([c], { type: 'application/json' });
			let a = document.createElement('a');
			let url = URL.createObjectURL(blob);
			a.download = '物模型';
			a.href = url;
			a.target = '_blank';
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		},
		// 导入
		import_click() {
			import_file.click();
		},
		// 导入物模型
		import_model() {
			let file = document.querySelector('#import_file').files[0];
			let reader = new FileReader();
			reader.readAsText(file);
			document.querySelector('#import_file').value = '';
			reader.onload = async (data) => {
				let body = JSON.parse(data.target.result);
				if (!body?.profile?.productId) {
					// 避免导入错误的文件
					this.$message.error('不是物模型文件！');
					return;
				}
				let r1 = await this.$prompt('请输入新物模型版本号', '提示', {
					confirmButtonText: '确定',
					cancelButtonText: '取消',
					inputPattern: /.{1,16}/,
					inputErrorMessage: '不能为空且最多16个字符！',
				}).catch(() => false);
				if (!r1) {
					return;
				}
				body.profile.productId = this.history_list[0].profile.productId;
				body.profile.versionAlias = r1.value;
				this.request('post', protocol_newVersion, this.token, body, () => {
					this.res_history_model(this.history_selected);
				});
			};
		},
	},
});
