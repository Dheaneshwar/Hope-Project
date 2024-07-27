const express = require('express');
const axios = require('axios');
const app = express();
const port = 3000;
app.use(express.static('public'))
app.use(express.json());
let result = {};
app.post("/travel-planner",async(req, res) => {
  const {source,locations}=req.body;
  console.log(locations);
  
  try {
    const distances = await getDistanceBetweenLocations(locations);
    console.log('Distances:', distances);

    const graph = buildGraph(distances);
    const shortPaths = dijkstra(graph, source.name); 
    result = { source: source.name, shortPaths };
    console.log(result);
    res.json(result);

  } catch (error) {
    console.error('Error processing data:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }

});

app.get('/result', (req, res) => {
  res.json(result);
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});


function buildGraph(distances) {
  const graph = {};
  distances.forEach(({ from, to, distance }) => {
      if (!graph[from]) graph[from] = {};
      if (!graph[to]) graph[to] = {};
      graph[from][to] = distance;
      graph[to][from] = distance; 
  });

  return graph;
}

async function getDistanceBetweenLocations(locations) {
    const distances = [];
    
    //this function is to fetch the distance from the OSRM API
    async function fetchDistance(start, end) {
      const startCoord = `${start.lng},${start.lat}`;
      const endCoord = `${end.lng},${end.lat}`;
      const url = `http://router.project-osrm.org/route/v1/driving/${startCoord};${endCoord}?overview=false`;
  
      try {
        const response = await fetch(url);
        const data = await response.json();
        if (data.routes && data.routes.length > 0) {
          return data.routes[0].distance; 
        }
      } catch (error) {
        console.error('Error fetching distance:', error);
      }
      return null;
    }
  
    //calculate the distances between each and every pair.
    for (let i = 0; i < locations.length; i++) {
      for (let j = i + 1; j < locations.length; j++) {
        const start = locations[i];
        const end = locations[j];
        const s_name=locations[i].name;
        const e_name=locations[j].name;
        const distance = await fetchDistance(start, end);
        if (distance !== null) {
          distances.push({
            from: s_name,
            to: e_name,
            distance
          });
        }
      }
    }
  
    return distances;
  }

  //DJIKSTRA FUNCTION --uses a priority queue (done below this)
  function dijkstra(graph, startNode) {
    const distances = {}; 
    const priorityQueue = new PriorityQueue(); 
    const visited = new Set(); 
  
    
    for (const node in graph) {
      distances[node] = Infinity; 
    }
    distances[startNode] = 0; 
    priorityQueue.enqueue(startNode, 0); 
  
    while (!priorityQueue.isEmpty()) {
      const { item: currentNode } = priorityQueue.dequeue(); 
      if (visited.has(currentNode)) continue; 
      visited.add(currentNode); 
  
      
      for (const neighbor in graph[currentNode]) {
        const distance = graph[currentNode][neighbor];
        const newDistance = distances[currentNode] + distance;
  
        
        if (newDistance < distances[neighbor]) {
          distances[neighbor] = newDistance;
          priorityQueue.enqueue(neighbor, newDistance);
        }
      }
    }
  
    return distances; 
  }
  
  // Priority Queue
  class PriorityQueue {
    constructor() {
      this.items = []; 
    }
  

    enqueue(item, priority) {
      this.items.push({ item, priority });
      this.items.sort((a, b) => a.priority - b.priority); //to have the lowest distance first, it sorts it ascending.
    }
  
    /*when dequeueing, it gives the node with the lowest distance
    as it will be in the front everytime as the queue gets sorted everytime an enqueue takes place above*/
    dequeue() {
      return this.items.shift();
    }
  
    // Check if the queue is empty
    isEmpty() {
      return this.items.length === 0;
    }
  }
  
  
