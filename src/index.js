// src/index.js
const ProductManagerAssistant = require('./assistant');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function main() {
  // Debug information
  console.log('Current working directory:', process.cwd());
  console.log('Files in current directory:', fs.readdirSync(process.cwd()));
  
  const calendarPath = path.join(process.cwd(), 'calendar.ics');
  console.log('Looking for calendar at:', calendarPath);
  console.log('File exists:', fs.existsSync(calendarPath));

  const assistant = new ProductManagerAssistant();
  
  console.log("\nProduct Manager Assistant Ready!");
  
  if (fs.existsSync(calendarPath)) {
    console.log("\nAttempting to load calendar...");
    const calendarResult = await assistant.loadCalendar(calendarPath);
    console.log(calendarResult);
  } else {
    console.log("\nNo calendar file found at:", calendarPath);
  }

  // Rest of the code remains the same...
  console.log("\nAvailable commands:");
  console.log("- Type 'tasks' to see your current tasks");
  console.log("- Type 'schedule' to get an optimized schedule");
  console.log("- Type 'help' for productivity tips");
  console.log("- Type 'clear' to reset conversation");
  console.log("- Type 'exit' to quit\n");

  const askQuestion = () => {
    rl.question('You: ', async (input) => {
      if (input.toLowerCase() === 'exit') {
        rl.close();
        return;
      }

      if (input.toLowerCase() === 'clear') {
        console.log(assistant.clearContext());
        askQuestion();
        return;
      }

      try {
        const response = await assistant.chat(input);
        console.log('\nAssistant:', response, '\n');
      } catch (error) {
        console.error('Error:', error);
      }

      askQuestion();
    });
  };

  askQuestion();
}

main();