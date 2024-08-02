import { 请求接口 as request } from '@/常用方法.js';

export function get_scene_list(params) {
	return request('/scene-rule/search', 'get', params);
}

export function excu_scene(id) {
	// 规则id
	return request(`/scene-rule/execute/${id}`, 'post');
}

export function stop_scene(id_list) {
	return request(`/scene-rule/stop`, 'post', id_list);
}

export function start_scene(id_list) {
	return request(`/scene-rule/start`, 'post', id_list);
}

export function delete_scene(id_list) {
	return request(`/scene-rule/delete`, 'post', [id_list]);
}

export function get_img_file(url) {
	return new URL(`../../通用UI资源/用户_场景设置/${url}`, import.meta.url).href;
}

export function get_place_device() {
	return request(`/place/user/findPlaceDevice`, 'post');
}

export function get_scene_config(id, type) {
	// type： 1获取服务 2获取传感器条件
	return request(`/scene/product/config/${id}?topicType=${type}`, 'get');
}

export function scene_save(data) {
	// type： 1获取服务 2获取传感器条件
	return request(`/scene-rule/saveOrUpdate`, 'post', data);
}

export default {
	get_scene_list,
	excu_scene,
	stop_scene,
	start_scene,
	delete_scene,
	get_img_file,
	get_place_device,
	get_scene_config,
	scene_save,
};
