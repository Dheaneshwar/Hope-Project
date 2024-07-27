const express = require('express');
const axios = require('axios');
const app = express();
const port = 3000;
app.use(express.static('public'))
app.use(express.json());
app.route('/travel-planner')
  .get((req, res) => {
    //something
  })
  .post(async(req, res) => {
    const {source,locations}=req.body;
    console.log(locations);
    
    const distances=getDistanceBetweenLocations(locations);
    const graph=buildGraph(distances);
    const short_paths=graph(graph,source);
    res.json(short_paths);
  
  })

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

// Dijkstra's algorithm implementation
function dijkstra(graph, startNode) {
  const distances = {};
  const visited = new Set();
  const priorityQueue = new PriorityQueue();

  // Initialize distances
  for (const node in graph) {
      distances[node] = Infinity;
  }
  distances[startNode] = 0;
  priorityQueue.enqueue(startNode, 0);

  while (!priorityQueue.isEmpty()) {
      const { value: currentNode } = priorityQueue.dequeue();
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

// PriorityQueue implementation for Dijkstra's algorithm
class PriorityQueue {
  constructor() {
      this.items = [];
  }

  enqueue(item, priority) {
      this.items.push({ item, priority });
      this.items.sort((a, b) => a.priority - b.priority);
  }

  dequeue() {
      return this.items.shift();
  }

  isEmpty() {
      return this.items.length === 0;
  }
}


function buildGraph(distances) {
  const graph = {};

  distances.forEach(({ from, to, distance }) => {
      if (!graph[from]) graph[from] = {};
      if (!graph[to]) graph[to] = {};
      graph[from][to] = distance;
      graph[to][from] = distance; // Assuming undirected graph
  });

  return graph;
}

async function getDistanceBetweenLocations(locations) {
    const distances = [];
    
    // Helper function to fetch distance from OSRM API
    async function fetchDistance(start, end) {
      const startCoord = `${start.lng},${start.lat}`;
      const endCoord = `${end.lng},${end.lat}`;
      const url = `http://router.project-osrm.org/route/v1/driving/${startCoord};${endCoord}?overview=false`;
  
      try {
        const response = await fetch(url);
        const data = await response.json();
        if (data.routes && data.routes.length > 0) {
          return data.routes[0].distance; // Distance in meters
        }
      } catch (error) {
        console.error('Error fetching distance:', error);
      }
      return null;
    }
  
    // Calculate distance between each pair of locations
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

  
