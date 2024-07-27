document.addEventListener('DOMContentLoaded', function() {
    fetch('/travel-planner')
      .then(response => response.json())
      .then(data => {
        document.getElementById('message').textContent = data.message;
      })
      .catch(error => {
        console.error('Error fetching message:', error);
        document.getElementById('message').textContent = 'Error loading message.';
      });
  });
  