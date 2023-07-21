let url = `${我是接口地址}/`;
let get_material_list_url = `${url}api-portal/video/playList`; // 获取播放列表详情
let material_search_url = `${url}api-file/doc/catalogue/shareMaterial/search`;
let upload_file_url = `${url}api-file/doc/file/chunk/create`;
let upload_error_url = `${url}api-file/files`;
let add_playlist_url = `${url}api-portal/video/add/playList`;
let edit_playlist_url = `${url}api-portal/video/update/playList`;
let get_file_page_url = `${url}api-file/doc/showDocPreViewTotalPage`;
let get_play_list_url = `${url}api-portal/video/search/playList`; //获取播放列表
let get_template_list_url = `${url}api-portal/displayBoard/template/list`; //获取模板列表

new Vue({
	el: '#index',
	mixins: [common_functions],
	data: {
		// 播放列表表单
		form: {
			name: '', // 名称
			select_list: [], // 所选数目
			list: [], // 添加到可选列表的
			repeal_list: [], // 可撤销操作列表
			renewal_list: [], // 可重做操作列表
			name_ban: false, //播放列表名是否可修改
		},
		// 播放设置表单
		play_form: {
			format_time: 0, // 转换成对应分、时的数字
			unit: 0, // 0秒 1分 2时
			option: ['秒', '分', '时'],
			err_show: false, // 信息提示
		},
		// 素材表单
		material_form: {
			page: 0, // 公共素材或其他
			search: '', // 搜索框
			type: 0, // 资源类别
			list: [], // 总列表 二维数组包含各个类别素材的列表
			total: 50, // 总条数
			page_size: 20, // 一次查多少条
			cur_page: 1, // 当前页
			loading: false, // 加载
			load_text: '', // 遮罩文字
		},
		html: {
			loading: false, // 总页面加载
			isIndeterminate: false, //非全选
			checkAll: false, // 全选
			tool_list: [
				{ icon: 'el-icon-plus', tips: '添加文件' },
				{ icon: 'el-icon-top', tips: '上移选中项' },
				{ icon: 'el-icon-bottom', tips: '下移选中项' },
				{ icon: 'el-icon-refresh', tips: '循环播放选中项' },
				{ icon: 'el-icon-s-tools', tips: '播放设置' },
				{ icon: 'el-icon-refresh-left', tips: '撤销' },
				{ icon: 'el-icon-refresh-right', tips: '重做' },
				{ icon: 'el-icon-delete', tips: '移除选中项' },
			],
			play_set_show: false, // 播放设置显示
			material_show: false, // 添加素材显示
			page_list: ['公共素材'], // 素材库选择
		},
		playlist: {
			show: false, // 展示播放列表
			loading: false, // 播放列表遮罩
			list: [], // 播放列表
			total: 0, //总条数
			page_size: 10, // 单页显示数量
			cur_page: 1, // 当前页
		},
		source: '', // 页面来源
	},
	mounted() {
		this.get_token();
		switch (this.prePage) {
			case 'scene':
				this.form.name_ban = true;
				break;
		}
		this.get_data();
		this.resize();
		window.onresize = () => {
			this.resize();
		};
	},
	methods: {
		resize() {
			// 计算根节点子体大小
			let dom = window.parent.document.documentElement;
			let width = dom.clientWidth;
			let ratio = Math.floor((width / 1920) * 100 + 0.5) / 100;
			dom.style.fontSize = ratio * 20 + 'px';
		},
		// 关闭弹窗
		close() {
			window.parent.postMessage({
				type: 'close',
			});
		},
		// 根据父页面存的数据查询数据
		get_data() {
			if (this.source) {
				// 如果是存到本地 看是否有本地存的数据 来区别是编辑还是新建
				if (window.sessionStorage.play_list_json) {
					let data = JSON.parse(window.sessionStorage.play_list_json);
					this.form.name = data.name;
					let list = [];
					let dtotal = 0;
					let dcount = 0;
					this.html.loading = true;
					for (let val of data.list || []) {
						let find = false;
						for (let val2 of list) {
							if (val2.fileId === val.fileId) {
								find = true; // 只要找到重复的就跳出查下一个
								break;
							}
						}
						if (!find) {
							// 有则不做修改 无则添加属性
							val.check = false;
							val.time_format = val.time_format || this.format_time(Number(val.fileDuration || 0) || Number(val.duration || (val.fileTypeString.indexOf('模板') == -1 ? 5 : 0)));
							val.img = val.img || val.thumbnailUrl || './img/icon.png'; //重定向属性 改成统一字段
							// 本地数据里有文档就查
							if (val.fileTypeString === '文档') {
								dtotal++;
								this.request('get', `${get_file_page_url}/${val.fileId}`, this.token, (res) => {
									dcount++;
									if (dcount === dtotal) {
										this.html.loading = false;
									}
									if (res.data.head.code !== 200) {
										return;
									}
									this.$set(val, 'docTotalPage', res.data.data);
								});
							}
							list.push(val);
						}
					}
					// 没有文档直接关闭遮罩
					if (!dtotal) {
						this.html.loading = false;
					}
					this.form.list = list;
				}
			} else {
				if (this.id) {
					// 有id传过来的是编辑 没有则是新建
					this.html.loading = true;
					this.request('get', `${get_material_list_url}/${this.id}`, this.token, (res) => {
						console.log('播放列表详情', res);
						this.html.loading = false;
						if (res.data.head.code !== 200) {
							return;
						}
						let data = res.data.data;
						this.form.name = data.playListName;
						for (let val of data.fileList) {
							val.check = false; // 添加属性
							val.time_format = this.format_time(Number(val.fileDuration || 0) || Number(val.duration || (val.fileTypeString.indexOf('模板') == -1 ? 5 : 0))); // 添加属性
							val.img = val.thumbnailUrl || './img/icon.png'; //重定向属性 改成统一字段
						}
						this.form.list = data.fileList;
					});
				}
			}
		},
		// 格式化时间
		format_time(time) {
			let seconds = time % 60;
			let t = Math.floor(time / 60);
			let minutes = t % 60;
			let hour = Math.floor(t / 60);
			return `${hour ? hour + 'h' : ''}${minutes ? minutes + 'm' : ''}${seconds}s`;
		},
		// 格式化文件大小
		format_size(size) {
			let byte = size % 1024;
			let t = Math.floor(size / 1024);
			let kb = t % 1024;
			let t2 = Math.floor(t / 1024);
			let mb = t2 % 1024;
			let gb = Math.floor(t2 / 1024);
			return `${gb ? gb + 'GB' : ''}${mb ? mb + 'MB' : ''}${kb ? kb + 'KB' : ''}${byte ? byte + 'b' : ''}`;
		},
		// 全选
		check_all(val) {
			if (val) {
				for (let val of this.form.list) {
					this.form.select_list.push(val);
				}
			} else {
				this.form.select_list = [];
			}
			for (let item of this.form.list) {
				item.check = val;
			}
			this.html.isIndeterminate = false;
		},
		// 单选文件
		select_item(file) {
			file.check = !file.check;
			if (!file.check) {
				for (let index = 0; index < this.form.select_list.length; index++) {
					if (file.fileId === this.form.select_list[index].fileId) {
						this.form.select_list.splice(index, 1);
						break;
					}
				}
			} else {
				this.sequence_format();
			}
			this.html.checkAll = this.form.select_list.length == this.form.list.length;
			this.html.isIndeterminate = this.form.select_list.length > 0 && this.form.select_list.length < this.form.list.length;
		},
		// 工具栏样式
		tool_style(index) {
			let t = ['block', 'center'];
			switch (index) {
				case 0:
					t.push('block1');
					break;
				default: // 除了第一个图标 其余都默认样式
					t.push('block2');
					if (this.form.select_list.length) {
						// 如果有选中的文件 则更改样式
						if (index === 7) {
							// 最后一个图标样式特殊
							t.splice(t.length - 1, 1, 'block3');
						} else if (index !== 5 && index !== 6) {
							t.splice(t.length - 1, 1, 'block1');
						}
					}
					if (this.form.repeal_list.length && index === 5) {
						t.splice(t.length - 1, 1, 'block1');
					}
					if (this.form.renewal_list.length && index === 6) {
						t.splice(t.length - 1, 1, 'block1');
					}
					break;
			}
			return t;
		},
		// 选中文件样式
		select_style(file) {
			return {
				border: file.check ? '1px solid #569EF8' : '',
				background: file.check ? 'rgba(86,158,248,0.1)' : '',
			};
		},
		// 选中文件左上位置图标样式
		select_style2(file) {
			return {
				background: file.check ? '#569EF8' : '',
				color: file.check ? '#fff' : '',
			};
		},
		// 工具栏点击事件
		tool(index) {
			// 只有修改原数据的操作才保存原始状态
			if (index === 0) {
				// 得要在点确定的时候再存当前状态 不然取消也保存会有重复
				this.material_form.page = 0;
				this.material_form.search = '';
				this.material_form.type = 0;
				this.html.material_show = true;
				this.material_selected_list = JSON.parse(JSON.stringify(this.form.list)); // 记录添加素材中勾选的项 并用于翻页时回显 和提交
				// 只在刚点加号时初始化数组元素 后续分页查询等只根据索引维护自身的单元
				this.classify_query();
				return;
			} else if (this.form.select_list.length && index !== 5 && index !== 6) {
				// 除了撤销操作都要保存
				this.form.repeal_list.push(JSON.parse(JSON.stringify(this.form.list)));
				// 勾选了文件才能点击下列工具
				switch (index) {
					case 1:
						this.up_select();
						break;
					case 2:
						this.down_select();
						break;
					case 3:
						this.loop_select();
						break;
					case 4:
						this.set_select();
						break;
					case 7:
						this.del_select();
						break;
				}
			} else if (this.form.repeal_list.length && index === 5) {
				this.repeal_select();
			} else if (this.form.renewal_list.length && index === 6) {
				this.renewal_select();
			}
		},
		// 根据source区别查询
		async classify_query() {
			let all = {
				type: '全部素材',
				list: [],
				count: 0,
			};
			let img = {
				type: '图片',
				list: [],
				count: 0,
			};
			let video = {
				type: '视频',
				list: [],
				count: 0,
			};
			let doc = {
				type: '文档',
				list: [],
				count: 0,
			};
			let music = {
				type: '音频',
				list: [],
				count: 0,
			};
			let template = {
				type: '自定义模板',
				list: [],
				count: 0,
			};
			let template2 = {
				type: '系统模板',
				list: [],
				count: 0,
			};
			// 根据source区分是全部显示还是分类显示
			switch (this.source) {
				case 'all':
					// 如果已经选了素材则不显示模板 反之同理
					if (this.form.list.length) {
						// 因为素材不能混用 只需要看列表第一个是什么类别
						switch (this.form.list[0].fileTypeString) {
							case '自定义模板':
								this.material_form.list = [template];
								await this.get_template_list(1, 0, false);
								break;
							case '系统模板':
								this.material_form.list = [template2];
								await this.get_template_list(1, 0, true);
								break;
							default:
								this.material_form.list = [all, doc, video, music, img];
								for (let index = 0; index < 5; index++) {
									await this.get_material(1, index);
								}
								break;
						}
					} else {
						this.material_form.list = [all, doc, video, music, img, template, template2];
						for (let index = 0; index < 5; index++) {
							await this.get_material(1, index);
						}
						await this.get_template_list(1, 5, false);
						await this.get_template_list(1, 6, true);
					}
					break;
				case '3':
					this.material_form.list = [template2];
					await this.get_template_list(1, 0, true);
					break;
				case '4':
					this.material_form.list = [template];
					await this.get_template_list(1, 0, false);
					break;
				case '5':
					this.material_form.list = [all, doc, video, music, img];
					for (let index = 0; index < 5; index++) {
						await this.get_material(1, index);
					}
					break;
				default:
					this.material_form.list = [all, doc, video, music, img];
					for (let index = 0; index < 5; index++) {
						await this.get_material(1, index);
					}
					break;
			}
		},
		// 上移功能
		up_select() {
			// 从前往后 依次移动
			for (let val of this.form.select_list) {
				// 每一项在 总列表 中的序列往前移动一个
				let i = 0;
				for (let val2 of this.form.list) {
					if (val.fileId === val2.fileId && i) {
						// i大于0才可执行
						if (this.form.list[i - 1].check) {
							// 当前项前不能也是勾选项
							break;
						}
						// 找到勾选文件在总列表的位置后 存一个备份 再将原位置的删除并在前一个位置插入
						let t = val2;
						this.form.list.splice(i, 1);
						this.form.list.splice(i - 1, 0, t);
						break;
					}
					i++;
				}
			}
		},
		// 下移功能
		down_select() {
			// 注意 这块得从后往前依次移动文件位置
			let list = this.form.select_list;
			let list2 = this.form.list;
			for (let index = list.length - 1; index >= 0; index--) {
				for (let index2 = list2.length - 1; index2 >= 0; index2--) {
					if (list[index].fileId === list2[index2].fileId && index2 < list2.length - 1) {
						// 最末尾的不能移动
						if (list2[index2 + 1].check) {
							// 当前文件位置后一位不能是勾选项
							break;
						}
						let t = list2[index2];
						// 注意 向下移动时 删除一个后面的会自动向前补 且向下移是后一个位置+1 但因为后一个往前补了所以以当前位置索引+1即可
						list2.splice(index2, 1);
						list2.splice(index2 + 1, 0, t);
						break;
					}
				}
			}
		},
		// 批量或者单个设置文件循环次数为2
		loop_select() {
			let flag = false;
			for (let val of this.form.select_list) {
				// 模板不能设置循环次数
				if (val.fileTypeString.indexOf('模板') !== -1) {
					flag = true;
					continue;
				}
				val.cycleNum = val.cycleNum === 1 ? 2 : val.cycleNum;
			}
			if (flag) {
				this.$message('模板不能设置循环次数');
			}
		},
		// 单个或批量播放设置
		set_select() {
			let a = this.form.select_list;
			for (let val of a) {
				if (val.fileTypeString === '视频' || val.fileTypeString === '音频' || val.fileTypeString.indexOf('模板') !== -1) {
					this.$message.error('不能设置视频、音频文件、模板的展示时间！');
					return;
				}
			}
			this.play_form.err_show = false;
			this.play_form.unit = a[0].unit || 0;
			this.play_form.format_time = Number(a[0].duration) / Math.pow(60, a[0].unit || 0); // 只勾选了一个或是展示时长相同取第一个作为设置时间
			for (let index = 0; index < a.length - 1; index++) {
				// 如果有一个勾选项展示时间不同则置0
				if (Number(a[index].duration) !== Number(a[index + 1].duration)) {
					this.play_form.unit = 0;
					this.play_form.format_time = 0;
					this.play_form.err_show = true;
					break;
				}
			}
			this.html.play_set_show = true;
		},
		// 撤销 撤回即原始状态列表
		repeal_select() {
			// 撤销时要保存撤销前当前状态 再撤销
			this.form.renewal_list.push(JSON.parse(JSON.stringify(this.form.list)));
			this.form.list = this.form.repeal_list.pop();
			this.clean_select_check();
		},
		// 重做
		renewal_select() {
			this.form.repeal_list.push(JSON.parse(JSON.stringify(this.form.list)));
			this.form.list = this.form.renewal_list.pop();
			this.clean_select_check();
		},
		// 撤销和重做要将页面临时数据重置
		clean_select_check() {
			this.html.isIndeterminate = false;
			this.html.checkAll = false;
			this.form.select_list = [];
			for (let val of this.form.list) {
				val.check = false;
			}
		},
		// 删除文件
		del_select() {
			for (let val of this.form.select_list) {
				for (let index = 0; index < this.form.list.length; index++) {
					if (val.fileId === this.form.list[index].fileId) {
						this.form.list.splice(index, 1);
						break;
					}
				}
			}
			this.html.isIndeterminate = false;
			this.html.checkAll = false;
			this.form.select_list = [];
		},
		// 重排序勾选列表
		sequence_format() {
			this.form.select_list = [];
			for (let val of this.form.list) {
				if (val.check) {
					this.form.select_list.push(val);
				}
			}
		},
		// 判断循环是否小于2
		is_loop_min(value, file) {
			if (value === 1) {
				this.$confirm('是否取消重复播放?', '提示', {
					confirmButtonText: '确定',
					cancelButtonText: '取消',
					center: true,
				}).catch(() => {
					file.cycleNum = 2;
				});
			}
		},
		// 单文件单词循环时长
		item_single_time(file) {
			return this.format_time((Number(file.fileDuration || 0) || Number(file.duration || 0)) * Number(file.docTotalPage || 1));
		},
		// 单文件总时长
		item_total_time(file) {
			return this.format_time((Number(file.fileDuration || 0) || Number(file.duration || 0)) * file.cycleNum * Number(file.docTotalPage || 1));
		},
		// 只有音视频显示 内容时长 其余都是 展示时长
		display_text(type) {
			switch (type) {
				case '视频':
				case '音频':
					return '内容时长：';
				case '自定义模板':
				case '系统模板':
					return '';
				default:
					return '展示时长：';
			}
		},
		// 保存播放设置
		set_play_time() {
			for (let val of this.form.select_list) {
				val.duration = this.play_form.format_time * Math.pow(60, this.play_form.unit);
				val.time_format = this.format_time(val.duration);
				val.unit = this.play_form.unit; // 单位要存下来 回显的时候用
			}
			this.html.play_set_show = false;
		},
		// 查素材数据
		get_material(page, type) {
			if (this.material_form.page === 0) {
				this.material_form.loading = true;
				return new Promise((success) => {
					this.request(
						'post',
						material_search_url,
						this.token,
						{
							pageNum: page,
							pageSize: this.material_form.page_size,
							keyword: this.material_form.search,
							condition: { catalogueId: -1, fileTypeList: type ? [type] : [1, 2, 3, 4] },
						},
						(res) => {
							console.log('公共素材', res);
							success();
							this.material_form.loading = false;
							if (res.data.head.code != 200) {
								this.material_form.total = 0;
								return;
							}
							let data = res.data.data;
							for (let val of data.data) {
								// 添加属性
								val.check = false;
								val.img = val.thumbnailUrl || './img/icon.png';
								val.size = this.format_size(Number(val.fileSize));
								// 如果是视音频 fileDuration 是字符串值 且 duration 值同 fileDuration
								// 如果是文档类 fileDuration 为null duration默认5秒
								val.fileDuration = val.duration;
								val.duration = val.duration || 5;
								val.fileId = val.id;
							}
							this.material_form.list[type].list = data.data;
							// 检查当前数据有没有勾选过的
							for (let val of this.material_selected_list) {
								for (let val2 of this.material_form.list[type].list) {
									// 仅看全部素材列表是否有勾选的 再计算各列表的勾选状态即可
									if (val.fileId === val2.fileId) {
										val2.check = true;
										break;
									}
								}
							}
							this.statistics_count();
							if (type === this.material_form.type) {
								// 不然挨个查的时候会重复覆盖显示值
								this.material_form.total = data.total;
								this.material_form.cur_page = page;
							}
						}
					);
				});
			}
		},
		// 获取自定义或系统模板列表
		get_template_list(page, type, is_sys) {
			this.material_form.loading = true;
			return new Promise((success) => {
				this.request('post', get_template_list_url, this.token, { pageNum: page, pageSize: this.material_form.page_size, condition: { industryType: -1, sysTemp: is_sys } }, (res) => {
					this.material_form.loading = false;
					success();
					if (res.data.head.code !== 200) {
						return;
					}
					let data = res.data.data;
					if (type === this.material_form.type) {
						this.material_form.total = data.total;
						this.material_form.cur_page = page;
					}
					for (let val of data.data) {
						// 添加属性
						val.check = false;
						val.img = val.thumbnails[0] || './img/icon.png';
						val.fileTypeString = this.material_form.list[type].type;
						val.fileDuration = null;
						val.duration = null;
						val.fileId = val.id;
						val.fileName = val.title;
						val.docTotalPage = null;
					}
					this.material_form.list[type].list = data.data;
					// 检查当前数据有没有勾选过的
					for (let val of this.material_selected_list) {
						for (let val2 of this.material_form.list[type].list) {
							// 仅看全部素材列表是否有勾选的 再计算各列表的勾选状态即可
							if (val.fileId === val2.fileId) {
								val2.check = true;
								break;
							}
						}
					}
					this.statistics_count();
				});
			});
		},
		// 点击标签时分类查询
		classify_get_data(index) {
			this.material_form.search = '';
			this.material_form.type = index;
			switch (this.source) {
				case 'all':
					if (this.form.list.length) {
						switch (this.form.list[0].fileTypeString) {
							case '自定义模板':
								this.get_template_list(1, 0, false);
								break;
							case '系统模板':
								this.get_template_list(1, 0, true);
								break;
							default:
								this.get_material(1, index);
								break;
						}
					} else {
						switch (index) {
							case 5:
								this.get_template_list(1, 5, false);
								break;
							case 6:
								this.get_template_list(1, 6, true);
								break;
							default:
								this.get_material(1, index);
								break;
						}
					}
					break;
				case '3':
					this.get_template_list(1, 0, true);
					break;
				case '4':
					this.get_template_list(1, 0, false);
					break;
				case '5':
				default:
					this.get_material(1, index);
					break;
			}
		},
		// 当前类别下分页查询
		classify_get_data2(page) {
			switch (this.source) {
				case 'all':
					if (this.form.list.length) {
						switch (this.form.list[0].fileTypeString) {
							case '自定义模板':
								this.get_template_list(page, 0, false);
								break;
							case '系统模板':
								this.get_template_list(page, 0, true);
								break;
							default:
								this.get_material(page, this.material_form.type);
								break;
						}
					} else {
						switch (this.material_form.type) {
							case 5:
								this.get_template_list(page, 5, false);
								break;
							case 6:
								this.get_template_list(page, 6, true);
								break;
							default:
								this.get_material(page, this.material_form.type);
								break;
						}
					}
					break;
				case '3':
					this.get_template_list(page, 0, true);
					break;
				case '4':
					this.get_template_list(page, 0, false);
					break;
				case '5':
				default:
					this.get_material(page, this.material_form.type);
					break;
			}
		},
		// 分类显示提示信息
		classify_show1() {
			switch (this.material_form.type) {
				case 5:
				case 6:
					return true;
				default:
					switch (this.source) {
						case '4':
						case '3':
							return true;
					}
					return false;
			}
		},
		// 对应页签下分页内容显示不同
		classify_show2() {
			switch (this.source) {
				case 'all':
					if (this.form.list.length) {
						switch (this.form.list[0].fileTypeString) {
							case '自定义模板':
							case '系统模板':
								return this.form.list[0].fileTypeString;
							default:
								switch (this.material_form.type) {
									case 0:
										return '全部素材';
									case 1:
										return '文档';
									case 2:
										return '视频';
									case 3:
										return '音频';
									case 4:
										return '图片';
								}
								break;
						}
					} else {
						switch (this.material_form.type) {
							case 0:
								return '全部素材';
							case 1:
								return '文档';
							case 2:
								return '视频';
							case 3:
								return '音频';
							case 4:
								return '图片';
							case 5:
								return '自定义模板';
							case 6:
								return '系统模板';
						}
					}
				case '3':
					return '系统模板';
				case '4':
					return '自定义模板';
				case '5':
				default:
					switch (this.material_form.type) {
						case 0:
							return '全部素材';
						case 1:
							return '文档';
						case 2:
							return '视频';
						case 3:
							return '音频';
						case 4:
							return '图片';
					}
			}
		},
		// 获取对应素材库数据
		get_page_data(page) {
			if (page === this.material_form.page) {
				return;
			}
			this.material_form.page = page;
			switch (page) {
				case 0:
					this.classify_query();
					break;
			}
		},
		// 选择素材 改变勾选状态 并计算勾选数
		select_material(file) {
			file.check = !file.check;
			if (file.check) {
				this.material_selected_list.push(file);
			} else {
				let index = 0;
				for (let val of this.material_selected_list) {
					if (val.fileId === file.fileId) {
						this.material_selected_list.splice(index, 1);
						break;
					}
					index++;
				}
			}
			// 如果是展示全部种类，点击互斥文件会清除另一方，并取消勾选
			if (this.source === 'all' && !this.form.list.length) {
				switch (file.fileTypeString) {
					case '自定义模板':
						for (let index = 0; index < this.material_selected_list.length; index++) {
							if (this.material_selected_list[index].fileTypeString !== '自定义模板') {
								this.material_selected_list[index].check = false;
								this.material_selected_list.splice(index, 1);
							}
						}
						break;
					case '系统模板':
						for (let index = 0; index < this.material_selected_list.length; index++) {
							if (this.material_selected_list[index].fileTypeString !== '系统模板') {
								this.material_selected_list[index].check = false;
								this.material_selected_list.splice(index, 1);
							}
						}
						break;
					default:
						for (let index = 0; index < this.material_selected_list.length; index++) {
							if (this.material_selected_list[index].fileTypeString.indexOf('模板') !== -1) {
								this.material_selected_list[index].check = false;
								this.material_selected_list.splice(index, 1);
							}
						}
						break;
				}
			}
			this.statistics_count();
		},
		// 统计勾选数
		statistics_count() {
			for (let val of this.material_form.list) {
				let count = 0;
				for (let val2 of val.list) {
					if (val2.check) {
						count++;
					}
				}
				val.count = count;
			}
		},
		// 清除选中素材
		clean_material_select() {
			for (let val of this.material_form.list) {
				for (let val2 of val.list) {
					val2.check = false;
				}
				val.count = 0;
			}
		},
		// 确定将选中素材添加到列表
		add_material_to_list() {
			this.material_form.loading = true;
			this.form.repeal_list.push(JSON.parse(JSON.stringify(this.form.list)));
			// 遍历勾选列表
			let count = 0;
			let doc_num = 0;
			for (let val of this.material_selected_list) {
				// 异步获取勾选的文档类型中总页数
				if (val.fileTypeString === '文档') {
					doc_num++;
					this.request('get', `${get_file_page_url}/${val.fileId}`, this.token, (res) => {
						count++;
						if (count === doc_num) {
							this.material_form.loading = false;
							this.html.material_show = false;
						}
						if (res.data.head.code !== 200) {
							return;
						}
						this.$set(val, 'docTotalPage', res.data.data);
					});
				}
				val.check = false; // 为了不影响播放列表勾选属性
				// 首先是选中项 其次找要添加的列表中是否有相同项
				let find = false;
				for (let val2 of this.form.list) {
					if (val2.fileId === val.fileId) {
						find = true;
						break;
					}
				}
				if (!find) {
					// 添加新属性
					this.$set(val, 'cycleNum', 1);
					this.$set(val, 'time_format', this.format_time(Number(val.fileDuration || '') || Number(val.duration || (val.fileTypeString.indexOf('模板') == -1 ? 5 : 0))));
					this.form.list.push(val);
				}
			}
			if (doc_num === 0) {
				this.material_form.loading = false;
				this.html.material_show = false;
			}
		},
		// 上传文件
		select_file() {
			select_file.click();
		},
		// 根据文件类型分类调用方法
		async classify_upload() {
			let file = document.querySelector('#select_file').files[0];
			let suffix = file.name.split('.').pop();
			if (suffix === 'mp4') {
				let t = await this.canvas_video(file);
				this.upload_file(t);
			} else {
				switch (suffix) {
					case 'ppt':
					case 'doc':
					case 'docx':
					case 'pdf':
					case 'pptx':
					case 'txt':
						let mb = Math.floor(file.size / Math.pow(1024, 2));
						if (mb >= 100) {
							this.$message.error('不支持过大的文件类型！');
							return;
						}
						break;
				}
				this.upload_file();
			}
		},
		// 生成视频缩略图
		canvas_video(file) {
			let url = URL.createObjectURL(file); // 生成文件的url
			let video = document.createElement('video'); // 创建video对象
			video.src = url; // 添加video对象属性
			video.currentTime = 2; // 设置视频播放位置，秒为单位
			return new Promise((success, fail) => {
				video.addEventListener('loadeddata', () => {
					let canvas = document.createElement('canvas');
					canvas.width = video.videoWidth;
					canvas.height = video.videoHeight;
					let ctx = canvas.getContext('2d');
					ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
					let base64 = canvas.toDataURL(); // 将canvas图转成base64
					let arr = base64.split(','); // ，号前是数据类型 后是base-64编码的字符串
					let option = { type: arr[0].match(/:(.*?);/)[1] };
					let str = atob(arr[1]); // atob是window方法 用于解码base64编码字符串 返回解码字符串
					let n = str.length;
					let u8arr = new Uint8Array(n); // 生成长度n的空数组
					while (n--) {
						u8arr[n] = str.charCodeAt(n);
					}
					success(new File([u8arr], file.name.split('.')[0] + '.png', option));
				});
			}).then((res) => res);
		},
		upload_file(params) {
			Upload({
				id: 'select_file',
				// small_file_slice_size: 5,
				// large_file_slice_size: 50,
				upload_url: `${upload_file_url}/-1`,
				token: this.token,
				fail_count: 3,
				uploadStart: () => {
					this.material_form.loading = true;
					this.material_form.load_text = '读取完成，准备开始上传';
					select_file.value = null;
				},
				uploadFail: (index, md5, name) => {
					this.material_form.load_text = `重试第${index}次`;
					if (index == 3) {
						this.material_form.loading = false;
						this.request('delete', `${upload_error_url}/${md5}?fileName=${name}`, this.token);
					}
				},
				uploadProgress: (cur, total, form_obj) => {
					this.material_form.load_text = `正在上传：${cur} / ${total}`;
					if (cur === total && params) {
						// 传最后一片时生成缩略图上传
						form_obj.append('thumbnailImage', params);
					}
				},
				uploadSuccess: () => {
					this.material_form.load_text = `上传成功`;
					setTimeout(async () => {
						// 重置一下
						this.material_form.search = '';
						this.material_form.type = 0;
						for (let index = 0; index < 5; index++) {
							await this.get_material(1, index);
						}
					}, 1000);
				},
				readStart: () => {
					this.material_form.loading = true;
					this.material_form.load_text = '当前文件较大，读取中请耐心等待...';
				},
				readProgress: (cur, total) => {
					this.material_form.load_text = `读取进度：${cur}/${total}`;
				},
			});
		},
		// 新建或修改播放列表
		save_playlist() {
			if (this.form.name === '') {
				this.$message.error('名称不能为空！');
				return;
			}
			if (!this.form.list.length) {
				this.$message.error('文件列表不能为空！');
				return;
			}
			let find1, find2;
			let count = 0;
			for (let val of this.form.list) {
				if (val.fileTypeString.indexOf('模板') !== -1) {
					count++;
					find1 = true;
				} else {
					find2 = true;
				}
			}
			if (find1 && find2) {
				this.$message.error('模板不能和普通素材混用！');
				return;
			}
			if (count > 1) {
				this.$message.error('只能添加一个模板');
				return;
			}
			if (this.source) {
				let list = [];
				for (let val of this.form.list) {
					for (let index = 0; index < val.cycleNum; index++) {
						list.push(val);
					}
				}
				window.sessionStorage.play_list_json = JSON.stringify({ name: this.form.name, list: list });
				window.parent.postMessage({ type: '素材轮播编辑完成' });
			} else {
				let body = {
					playListName: this.form.name,
					fileList: [],
				};
				if (this.id) {
					body.id = this.id;
				}
				for (let val of this.form.list) {
					let t = {
						cycleNum: val.cycleNum,
						duration: val.fileDuration || val.duration,
						fileId: val.fileId,
					};
					body.fileList.push(t);
				}
				this.html.loading = true;
				this.request(this.id ? 'put' : 'post', this.id ? edit_playlist_url : add_playlist_url, this.token, body, (res) => {
					this.html.loading = false;
					if (res.data.head.code !== 200) {
						return;
					}
					window.parent.postMessage({
						type: 'close and refresh',
					});
				});
			}
		},
		// 获取播放列表
		get_playlist(page) {
			this.playlist.loading = true;
			this.request('post', get_play_list_url, this.token, { pageNum: page, pageSize: this.playlist.page_size, condition: {} }, (res) => {
				console.log('播放列表', res);
				this.playlist.loading = false;
				if (res.data.head.code !== 200) {
					return;
				}
				let data = res.data.data;
				this.playlist.total = data.total;
				this.playlist.cur_page = page;
				for (let val of data.data) {
					val.check = false; //添加属性
					for (let val2 of this.playlist_select) {
						if (val2.id === val.id) {
							val.check = true;
							break;
						}
					}
				}
				this.playlist.list = data.data;
			});
		},
		// 展示播放列表 复制
		show_playlist() {
			this.playlist.show = true;
			this.playlist.list = [];
			this.playlist.total = 0;
			this.playlist.cur_page = 1;
			this.playlist_select = []; // 记录勾选项
			this.get_playlist(1);
		},
		// 勾选播放列表 添加到列表项
		select_playlist(obj) {
			obj.check = !obj.check;
			if (obj.check) {
				this.playlist_select.push(obj);
			} else {
				for (let index = 0; index < this.playlist_select.length; index++) {
					if (obj.id === this.playlist_select[index].id) {
						this.playlist_select.splice(index, 1);
						break;
					}
				}
			}
		},
		select_playlist_change(check, obj) {
			if (check) {
				this.playlist_select.push(obj);
			} else {
				for (let index = 0; index < this.playlist_select.length; index++) {
					if (obj.id === this.playlist_select[index].id) {
						this.playlist_select.splice(index, 1);
						break;
					}
				}
			}
		},
		// 复制到当前操作的播放列表 记录操作
		async clone_playlist() {
			this.form.repeal_list.push(JSON.parse(JSON.stringify(this.form.list)));
			this.playlist.loading = true;
			let list = [...this.form.list]; //原有的列表项展开添加到临时列表
			// 因为要从已有列表中筛选是否重复 必须是同步执行
			for (let val of this.playlist_select) {
				await new Promise((success, fail) => {
					this.request('get', `${get_material_list_url}/${val.id}`, this.token, (res) => {
						success();
						if (res.data.head.code !== 200) {
							return;
						}
						let data = res.data.data.fileList;
						for (let val of data) {
							let find = false;
							for (let val2 of list) {
								if (val.fileId === val2.fileId) {
									find = true;
									break;
								}
							}
							if (!find) {
								val.check = false; // 添加属性
								val.time_format = this.format_time(Number(val.fileDuration || 0) || Number(val.duration || (val.fileTypeString.indexOf('模板') == -1 ? 5 : 0))); // 添加属性
								val.img = val.thumbnailUrl || './img/icon.png'; //重定向属性 改成统一字段
								list.push(val);
							}
						}
					});
				});
			}
			this.form.list = list;
			this.playlist.loading = false;
			this.playlist.show = false;
		},
	},
	computed: {
		total_time() {
			let t = 0;
			for (let val of this.form.list) {
				let t2 = (Number(val.fileDuration || 0) || Number(val.duration || (val.fileTypeString.indexOf('模板') == -1 ? 5 : 0))) * val.cycleNum * Number(val.docTotalPage || 1);
				t += t2;
			}
			return this.format_time(t);
		},
	},
});
