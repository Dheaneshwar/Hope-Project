const express = require('express');
const axios = require('axios');
const app = express();
const port = 3000;
app.use(express.static('public'))
app.use(express.json());
let result = {};
let distances={}
app.post("/travel-planner",async(req, res) => {
  const {source,locations}=req.body;
  console.log(locations);
  
  try {
    distances = await getDistanceBetweenLocations(locations);
    console.log('Distances:', distances);

    const graph = buildGraph(distances);
    const shortPaths = dijkstra(graph, source.name); 
    const dmap=buildDistanceMap(distances);
    const tspRoute = findTSPRoute(locations, dmap);
    result = { source: source.name, shortPaths,tspRoute};
    console.log('Result:', result);
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
        const distance = await fetchDistance(start, end)/1000;
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
  
  //TSP FUNCTION
  function findTSPRoute(locations, distanceMap) {
    const route = [];
    const visited = new Set();
    console.log("Starting TSP route calculation...");
  
    // Helper function to get distance between two locations
    function getDistance(from, to) {
      return distanceMap[from]?.[to] || Infinity;
    }
  
    // Start from the first location in the list
    let current = locations[0];
    visited.add(current.name);
    route.push(current);
  
    while (visited.size < locations.length) {
      let nearest = null;
      let shortestDistance = Infinity;
  
      console.log(`Current location: ${current.name}`);
      console.log(`Visited locations: ${Array.from(visited)}`);
  
      for (const loc of locations) {
        if (!visited.has(loc.name)) {
          const distance = getDistance(current.name, loc.name);
          if (distance < shortestDistance) {
            shortestDistance = distance;
            nearest = loc;
          }
        }
      }
  
      if (nearest) {
        route.push(nearest);
        visited.add(nearest.name);
        current = nearest;
      } else {
        console.error("No nearest location found. Possible issue.");
        break;
      }
    }
  
    // Return to the start point to complete the cycle
    if (route.length > 0) {
      route.push(locations[0]);
    }
  
    console.log("Completed TSP route calculation");
    return route;
  }
  

function buildDistanceMap(distances) {
  const distanceMap = {};
  
  distances.forEach(({ from, to, distance }) => {
    if (!distanceMap[from]) distanceMap[from] = {};
    if (!distanceMap[to]) distanceMap[to] = {};
    distanceMap[from][to] = distance;
    distanceMap[to][from] = distance; // Assuming it's bidirectional
  });

  return distanceMap;
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
  
  
