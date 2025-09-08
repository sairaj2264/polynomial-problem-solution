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
 * Parses a string representation of a number in a given base into a BigInt.
 * This is necessary because BigInt() does not natively support a radix parameter.
 * @param {string} str - The string to parse (e.g., "111").
 * @param {number} base - The base of the number (e.g., 2).
 * @returns {BigInt} The parsed BigInt value.
 */
function parseBigInt(str, base) {
  let result = 0n;
  const bigBase = BigInt(base);
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    // parseInt can handle up to base 36 for character-to-digit conversion
    const digit = parseInt(char, 36);
    result = result * bigBase + BigInt(digit);
  }
  return result;
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
 * It uses BigInt to handle potentially very large numbers.
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
        const x = BigInt(key); // Use BigInt for x-coordinates
        const base = parseInt(pointData.base, 10);
        const valueStr = pointData.value;
        const y = parseBigInt(valueStr, base); // Use helper to parse y into BigInt
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
 * --- Step 3: Find the constant using Lagrange Interpolation with BigInt ---
 * This version uses BigInt for all calculations to ensure precision with large numbers.
 *
 * @param {Array<object>} allPoints - Array of all available {x, y} points as BigInts.
 * @param {number} k - The number of points required to solve the polynomial.
 * @returns {BigInt} The calculated constant term C as a BigInt.
 */
function findConstantWithLagrange(allPoints, k) {
  console.log(`\nStep 3: Calculating constant with Lagrange on ${k} points...`);

  const selectedPoints = allPoints.slice(0, k);
  console.log("Using points:", selectedPoints.map(p => ({ x: p.x.toString(), y: p.y.toString() })));

  let constantC = 0n; // Use BigInt literal for zero

  // Outer loop for the Summation (Σ) over each point j
  for (let j = 0; j < selectedPoints.length; j++) {
    const y_j = selectedPoints[j].y;
    const x_j = selectedPoints[j].x;

    // To avoid issues with fractional results in BigInt division, we calculate
    // the numerator and denominator of each term separately.
    let termNumerator = y_j;
    let termDenominator = 1n;

    // Inner loop for the Product (Π) over each point i
    for (let i = 0; i < selectedPoints.length; i++) {
      if (i === j) {
        continue;
      }
      const x_i = selectedPoints[i].x;
      
      // Multiply the numerator of L_j(0) -> Π(x_i)
      termNumerator *= x_i;
      
      // Multiply the denominator of L_j(0) -> Π(x_i - x_j)
      termDenominator *= x_i - x_j;
    }

    // Add the calculated term (numerator / denominator) to our total sum.
    // BigInt division truncates, which is correct here as each term should be an integer.
    constantC += termNumerator / termDenominator;
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
    console.log("Decoded Points:", processedData.points.map(p => ({ x: p.x.toString(), y: p.y.toString() })));

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
      // The result is a BigInt, which console.log handles correctly.
      console.log(`The constant term of the polynomial (C) is: ${constant}`);
    }
  } catch (error) {
    console.error(`\nA critical error occurred: ${error.message}`);
  }
}

main();

