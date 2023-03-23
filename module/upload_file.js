(function () {
	function Upload(obj) {
		let reader = new FileReader();
		let slice_list = [];
		let file = document.getElementById(obj.id).files[0]; // 根据input标签id获取文件
		let max_size = 1024 * 1024 * 50; // 50M以内文件读取很快 以此为分隔
		let file_size = file.size; // 此处获取文件大小用于判断是大文件还是小文件
		if (file_size <= max_size) {
			// 小文件
			if (!obj.small_file_slice_size) {
				return false;
			}
			let slice_size = 1024 * 1024 * obj.small_file_slice_size; // 配置小文件分片大小 M为单位
			let slice_total = Math.ceil(file_size / slice_size); // 计算总片数 用以生成切片数组
			for (let i = 0; i < slice_total; i++) {
				let t = file.slice(slice_size * i, slice_size * (i + 1));
				slice_list.push(t);
			}
			reader.readAsBinaryString(file); // 小文件使用此方法直接读取并生成总文件md5
			reader.onload = (e) => {
				let md5 = SparkMD5.hashBinary(e.target.result);
				obj.uploadStart(); // 配置 开始上传文件时执行
				let upload_index = 0; // 上传索引
				let fail_index = 0;
				slice_upload(upload_index, slice_list, md5, file, obj, fail_index); // 需要传入索引、切片数组、总文件md5、文件对象、配置对象、失败次数
			};
		} else {
			if (!obj.large_file_slice_size || obj.large_file_slice_size > 50) {
				// 单片大小大于50M的也不能传
				return false;
			}
			obj.readStart(); // 配置 大文件读取较慢时执行开始读取提示
			let slice_size = 1024 * 1024 * obj.large_file_slice_size; // 配置大文件切片大小
			let slice_total = Math.ceil(file_size / slice_size);
			for (let i = 0; i < slice_total; i++) {
				let t = file.slice(slice_size * i, slice_size * (i + 1));
				slice_list.push(t);
			}
			let spark = new SparkMD5.ArrayBuffer(); // 大文件需要分片加入缓存后生成总文件MD5 需要用此方法
			let read_file_index = 0; // 读取大文件时的索引
			large_file_md5(read_file_index, spark, reader, slice_list, obj, file); // 需要传入读取文件索引、spark对象、FileReader对象、切片数组、配置对象、文件对象
		}
	}
	function large_file_md5(index, spark, reader, slice_list, obj, file) {
		reader.readAsArrayBuffer(slice_list[index]); // 读取单片文件
		obj.readProgress(++index, slice_list.length); // 配置 读取进程时执行
		reader.onload = (e) => {
			spark.append(e.target.result); // 单片文件读取结果加入缓存
			if (index < slice_list.length) {
				// 读取文件索引小于总片数时 继续递归执行
				large_file_md5(index, spark, reader, slice_list, obj, file);
			} else {
				// 读取完使用end命令生成总文件MD5
				let md5 = spark.end();
				obj.uploadStart(); // 配置 开始上传文件时执行
				let upload_index = 0;
				let fail_index = 0;
				slice_upload(upload_index, slice_list, md5, file, obj, fail_index);
			}
		};
	}
	function slice_upload(index, slice_list, md5, file, obj, fail_index) {
		let form_obj = new FormData();
		form_obj.append(obj.file_chunksize ? obj.file_chunksize : 'file_chunksize', slice_list[index].size); // 单片文件大小
		form_obj.append(obj.file_data ? obj.file_data : 'file_data', slice_list[index]); // 单片文件数据
		form_obj.append(obj.file_index ? obj.file_index : 'file_index', index + 1); // 当前第几片 从1开始计数
		form_obj.append(obj.file_md5 ? obj.file_md5 : 'file_md5', md5); // 总文件md5
		form_obj.append(obj.file_name ? obj.file_name : 'file_name', file.name); // 文件名
		form_obj.append(obj.file_size ? obj.file_size : 'file_size', file.size); // 总文件大小
		let t = file.name.split('.'); // 为了避免文件名中含多个.
		form_obj.append(obj.file_suffix ? obj.file_suffix : 'file_suffix', t[t.length - 1]); // 文件后缀
		form_obj.append(obj.file_total ? obj.file_total : 'file_total', slice_list.length); // 总片数

		obj.uploadProgress(index + 1, slice_list.length, form_obj); // 配置 上传进程执行

		let r = new FileReader();
		r.readAsBinaryString(slice_list[index]); // 单片大小都不大可以用此方法读取
		r.onload = (e) => {
			form_obj.append(obj.fileChunkMd5 ? obj.fileChunkMd5 : 'fileChunkMd5', SparkMD5.hashBinary(e.target.result)); // 单片MD5
			// 配置上传路径、验证密匙
			axios({
				method: 'post',
				url: obj.upload_url,
				data: form_obj,
				headers: {
					Authorization: `Bearer ${obj.token}`,
					'content-type': 'multipart/form-data',
				},
			}).then((res) => {
				if (res.data.head.code != 200) {
					obj.uploadFail(++fail_index); // 配置 上传失败时执行
					// 限制失败次数
					if (fail_index == obj.fail_count) {
						return;
					}
					setTimeout(() => {
						// 等待1秒后重新开始上传进程
						obj.uploadStart(); // 配置 上传开始执行
						let upload_index = 0;
						slice_upload(upload_index, slice_list, md5, file, obj, fail_index);
					}, 1000);
					return;
				}
				if (++index < slice_list.length) {
					// 当前索引小于总片数时继续传下一片
					slice_upload(index, slice_list, md5, file, obj, fail_index);
				} else {
					// 配置 上传完成时执行
					obj.uploadSuccess(res, file);
				}
			});
			form_obj = null; // 释放内存
		};
	}
	window.Upload = Upload;
})();
