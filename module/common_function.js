const common_functions = {
	methods: {
		// 获取地址栏token
		get_token() {
			let temp = location.search.substring(1).split('&');
			for (let val of temp) {
				let t = val.split('=');
				if (t[0].match(/^token$/) != null) {
					window.sessionStorage.token = this.token = t[1];
				} else if (t[0].match(/^userName$/) != null) {
					window.sessionStorage.userName = this.userName = t[1];
				} else if (t[0].match(/^id$/) != null) {
					window.sessionStorage.id = this.id = t[1];
				} else if (t[0].match(/^device_name$/) != null) {
					// cookie里只能存编码后的中文字符
					window.sessionStorage.device_name = this.device_name = t[1];
				} else if (t[0].match(/^productId$/) != null) {
					window.sessionStorage.product_id = this.product_id = t[1];
				} else if (t[0].match(/^deviceId$/) != null) {
					window.sessionStorage.device_id = this.device_id = t[1];
				} else if (t[0].match(/^prePage$/) != null) {
					window.sessionStorage.prePage = this.prePage = t[1];
				} else if (t[0].match(/^type$/) != null) {
					window.sessionStorage.router = this.router = t[1];
				} else if (t[0].match(/^theme$/) != null) {
					window.sessionStorage.theme = this.theme = t[1];
				} else if (t[0].match(/^source$/) != null) {
					window.sessionStorage.source = this.source = t[1];
				} else if (t[0].match(/^application$/) != null) {
					window.sessionStorage.application = this.application = t[1];
				}
			}
			let url = location.href.split('?')[0];
			history.replaceState('', '', url);
		},
		//封装的请求方法
		request(method, url, token, data, func) {
			return axios({
				method: method,
				url: url,
				data: typeof data === 'object' ? data : typeof data === 'function' ? ((func = data), null) : null,
				headers: {
					Authorization: `Bearer ${token}`,
					'content-type': 'application/json',
				},
			}).then((res) => {
				if (res.data.head.code == 200) {
					if (typeof func === 'function') {
						func(res);
					}
				} else if (res.data.head.code == 401) {
					window.parent.postMessage({ type: 'log_out' });
				} else {
					this.$alert(res?.data?.head?.message, '提示', {
						confirmButtonText: '确定',
						callback: () => {
							if (typeof func === 'function') {
								func(res);
							}
						},
					});
				}
				return res;
			});
		},
		// 获取任意节点到视窗顶的距离
		get_clientY(element) {
			let top = element.offsetTop;
			let parent_dom = element.offsetParent;
			// 不断遍历查找上一层父节点 直到为null body的父节点就是null
			while (parent_dom != null) {
				top += parent_dom.offsetTop;
				parent_dom = parent_dom.offsetParent;
			}
			return top;
		},
		// 获取任意节点到视窗顶的距离
		get_clientX(element) {
			let left = element.offsetLeft;
			let parent_dom = element.offsetParent;
			while (parent_dom != null) {
				left += parent_dom.offsetLeft;
				parent_dom = parent_dom.offsetParent;
			}
			return left;
		},
	},
};
