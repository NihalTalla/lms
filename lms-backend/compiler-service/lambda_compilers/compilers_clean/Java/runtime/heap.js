class Heap {
  constructor() {
    this.objects = {};
    this.nextId = 1;
  }

  allocateArray(size) {
    const id = this.nextId++;
    this.objects[id] = new Array(size).fill(0);
    return id;
  }

  getArray(id) {
    return this.objects[id];
  }
  
  // v4.2: ArrayList support
  allocateArrayList() {
    const id = this.nextId++;
    this.objects[id] = []; // JavaScript array for ArrayList
    return id;
  }
  
  getArrayList(id) {
    return this.objects[id];
  }
  
  // v4.2: HashMap support
  allocateHashMap() {
    const id = this.nextId++;
    this.objects[id] = {}; // JavaScript object for HashMap
    return id;
  }
  
  getHashMap(id) {
    return this.objects[id];
  }
  
  // v4.3: Iterator support
  // Iterator stores: { collectionType: "ArrayList" | "HashMap", collectionId: number, index: number, keys: [] }
  allocateIterator(collectionType, collectionId, keys = null) {
    const id = this.nextId++;
    this.objects[id] = {
      collectionType: collectionType,
      collectionId: collectionId,
      index: 0,
      keys: keys || [] // For HashMap, store keys array
    };
    return id;
  }
  
  getIterator(id) {
    return this.objects[id];
  }
  
  // v4.5: StringBuilder support
  allocateStringBuilder() {
    const id = this.nextId++;
    this.objects[id] = ""; // JavaScript string for StringBuilder
    return id;
  }
  
  getStringBuilder(id) {
    return this.objects[id];
  }
}

module.exports = new Heap();
