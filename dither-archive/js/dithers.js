import * as THREE from 'three';
class Dithers {
  constructor() {
    this.url = 'image_tsne_clusters.json';
    this.data = []
    this.cluster_centers = []
    this.colors = [
      new THREE.Color(0xffdd), // Red
      new THREE.Color(0xddffdd),  // Green
      new THREE.Color(0xddff), // Blue
      new THREE.Color(0xffffdd),  // Yellow
      new THREE.Color(0xffddff),  // Purple
      new THREE.Color(0xddffff),  // Cyan
      new THREE.Color(0xff88dd),  // Orange
      new THREE.Color(0x8888ff)    // Light Blue
    ];
    // this.cb = callback
  }

  load() {
    // console.log('loading data');
    // load JSON file
    fetch(this.url)
      .then(response => response.json())
      .then(data => {
        // console.log(data);
        this.data = this.enhance_data(data);
        this.data = this.assign_height_count(this.data);
        // console.log(this.data);
        this.data = this.data.sort((a, b) => a.og_index - b.og_index);
        // console.log(data);
        this.cluster_centers = this.get_cluster_centers();
        // console.log(this.cluster_centers);
      });
  }

  enhance_data(data) {
    const result = [];
    for (let i = 0; i < data.length; i++) {
      const obj = data[i];
      const x = Math.floor(obj.x);
      const y = Math.floor(obj.y);
      const index = obj.image_path.match(/dither-(\d+)\.jpg/);
      // console.log(index[1]);
      // remove "/Users/ya/Documents/WEB/Yyyyddaannnnoooo.github.io/dither-archive/" from image_path
      const url = obj.image_path.replace('/Users/ya/Documents/WEB/Yyyyaaaannnnoooo.github.io/dither-archive/', '');
      // const normal_url = normal_url + obj.index + '.jpg';
      const new_obj = {
        x: x,
        y: y,
        url: url,
        cluster: obj.cluster,
        og_index: parseInt(index[1]),
        saved: false,
        // normal_url: normal_url,
        loaded: false,
        mesh: null
      };
      result.push(new_obj);
    }
    return result;
  }



  assign_height_count(meshData) {
    const positionCount = new Map(); // Track how many times (x, y) appears

    return meshData.map((mesh) => {
      const key = `${mesh.x},${mesh.y}`; // Unique key for each (x, y)

      // Get current count and increment it
      const count = positionCount.get(key) || 0;
      positionCount.set(key, count + 1);

      // Assign the count as the new "z" value
      return { ...mesh, z: count };
    });
  }

  get_cluster_centers() {
    const result = [];
    for (let i = 0; i < 8; i++) {
      const cluster_arr = this.data.filter(item => item.cluster === i)
      // console.log(cluster_arr);
      const center = this.get_center(cluster_arr)
      result.push({ cluster: i, center, color: this.colors[i] })
    }
    return result
  }

  get_center(data) {
    const xs = data.map(item => item.x)
    const ys = data.map(item => item.y)
    const sum_x = xs.reduce((acc, num) => acc + num, 0);
    const sum_y = ys.reduce((acc, num) => acc + num, 0);
    const avg_x = sum_x / xs.length;
    const avg_y = sum_y / ys.length;
    return { x: Math.floor(avg_x), y: Math.floor(avg_y) }
  }

  save_dither(index) {
    // console.log(index);
    const result = this.data.filter(item => item.og_index === parseInt(index))[0]
    result.saved = true
    console.log(result);
  }

  get_saved_dithers_count() {
    const result = this.data.filter(item => item.saved === true)
    return result.length
  }

  get_neighbours(arr) {
    // Filter objects where og_index is in the validIndices 
    const result = this.data.filter(obj => arr.includes(obj.og_index));
    return result.sort((a, b) => a.og_index - b.og_index)
  }

}

export { Dithers };