//To run the program there are some steps to follow.
//1. Open the terminal and navigate to the directory where the solution.js file is located.
//2. Run the command "node solution.js" to execute the program.
//3. Follow the instructions provided in the terminal

const fs = require("fs");
const path = require("path");
const readline = require("readline");

/**
 * A helper function to promisify readline.question.
 * @param {string} query - The question to ask the user.
 * @param {readline.Interface} rl - The readline interface instance.
 * @returns {Promise<string>} A promise that resolves with the user's answer.
 */
function askQuestion(query, rl) {
  return new Promise((resolve) => rl.question(query, resolve));
}

/**
 * --- Step 1 (New): Get Input from User ---
 * This function prompts the user to choose an input method and returns the parsed JSON data.
 * @returns {Promise<object|null>} A promise that resolves with the parsed JSON object or null on error.
 */
async function getInputData() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    console.log("Please choose your input method:");
    console.log(
      "  1. From a file name in the same directory (e.g., data.json)"
    );
    console.log("  2. From a file path (e.g., /Users/me/Documents/data.json)");
    console.log("  3. Paste the raw JSON content directly into the terminal.");

    const choice = await askQuestion("Enter your choice (1, 2, or 3): ", rl);
    let jsonString;

    switch (choice.trim()) {
      case "1":
        const fileName = await askQuestion(
          "Enter the file name (e.g., data.json): ",
          rl
        );
        const localPath = path.join(__dirname, fileName);
        jsonString = fs.readFileSync(localPath, "utf8");
        rl.close();
        break;
      case "2":
        const filePath = await askQuestion("Enter the full file path: ", rl);
        jsonString = fs.readFileSync(filePath, "utf8");
        rl.close();
        break;
      case "3":
        console.log(
          "Please paste the raw, single-line JSON content below(choose (past as one line button) and press Enter:"
        );
        jsonString = await askQuestion("> ", rl);
        rl.close();
        break;
      default:
        console.error(
          "Invalid choice. Please run the script again and choose 1, 2, or 3."
        );
        rl.close();
        return null;
    }

    // Handle case where no input was provided for option 3
    if (!jsonString) {
      console.error("\nNo JSON content was provided.");
      return null;
    }

    return JSON.parse(jsonString);
  } catch (error) {
    console.error(`\nAn error occurred while getting input: ${error.message}`);
    if (!rl.closed) {
      rl.close();
    }
    return null;
  }
}

/**
 * --- Step 2: Decode the base-n values into points ---
 * This function takes the parsed JSON object and prepares the data for interpolation.
 * @param {object} data - The parsed JSON data.
 * @returns {object|null} An object containing k and the list of decoded points.
 */
function decodeFromJSON(data) {
  try {
    console.log("\nDecoding the provided JSON data...");

    const k = data.keys.k;
    const points = [];

    for (const key in data) {
      if (!isNaN(key)) {
        const pointData = data[key];
        const x = parseInt(key, 10);
        const base = parseInt(pointData.base, 10);
        const valueStr = pointData.value;
        const y = parseInt(valueStr, base);
        points.push({ x, y });
      }
    }

    return { k, points };
  } catch (error) {
    console.error(`An error occurred during decoding: ${error.message}`);
    console.error("Please ensure the JSON structure is correct.");
    return null;
  }
}

/**
 * --- Step 3: Find the constant using Lagrange Interpolation ---
 * The constant term 'C' of a polynomial P(x) is the value of P(0).
 *
 * Formula: C = P(0) = Σ [y_j * L_j(0)]  (from j=0 to k-1)
 * where L_j(0) is the Lagrange basis polynomial evaluated at x=0.
 *
 * L_j(0) = Π [ (0 - x_i) / (x_j - x_i) ] (from i=0 to k-1, where i != j)
 * This simplifies to: Π [ x_i / (x_i - x_j) ]
 *
 * @param {Array<object>} allPoints - Array of all available {x, y} points.
 * @param {number} k - The number of points required to solve the polynomial.
 * @returns {number} The calculated constant term C.
 */
function findConstantWithLagrange(allPoints, k) {
  console.log(`\nStep 3: Calculating constant with Lagrange on ${k} points...`);

  // As per the problem, we only need 'k' points to solve.
  // We will select the first 'k' points from the decoded list.
  const selectedPoints = allPoints.slice(0, k);
  console.log("Using points:", selectedPoints);

  let constantC = 0.0;

  // Outer loop for the Summation (Σ) over each point j
  for (let j = 0; j < selectedPoints.length; j++) {
    const y_j = selectedPoints[j].y;
    const x_j = selectedPoints[j].x;

    let lagrangeBasis = 1.0; // This will hold the product value for L_j(0)

    // Inner loop for the Product (Π) over each point i
    for (let i = 0; i < selectedPoints.length; i++) {
      if (i === j) {
        continue;
      }

      const x_i = selectedPoints[i].x;

      // Calculate the term for the product: x_i / (x_i - x_j)
      lagrangeBasis *= x_i / (x_i - x_j);
    }

    // Add the calculated term y_j * L_j(0) to our total sum
    constantC += y_j * lagrangeBasis;
  }

  return constantC;
}

// --- Main Execution Flow ---
async function main() {
  try {
    const jsonData = await getInputData();

    if (!jsonData) {
      return;
    }

    console.log("\nJSON data acquired successfully.");

    const processedData = decodeFromJSON(jsonData);

    if (!processedData) {
      return;
    }

    console.log("Decoding complete.");
    console.log("Decoded Points:", processedData.points);

    if (processedData.points.length < processedData.k) {
      console.error(
        `\nError: Not enough points to solve. The problem requires k=${processedData.k}, but only ${processedData.points.length} points were provided.`
      );
    } else {
      const constant = findConstantWithLagrange(
        processedData.points,
        processedData.k
      );
      console.log(`\nCalculation complete.`);
      console.log(`The constant term of the polynomial (C) is: ${constant}`);
    }
  } catch (error) {
    console.error(`\nA critical error occurred: ${error.message}`);
  }
}

main();
