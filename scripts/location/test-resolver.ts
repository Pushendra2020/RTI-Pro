import { resolveIndianLocation } from "../../lib/location/resolver";

interface Fixture { query: string; expected: string; context?: { pincode?: string } }
const fixtures: Fixture[] = [
  { query: "in jogeshwari there is a metro construction project", expected: "Jogeshwari West" },
  { query: "Nerul, Navi Mumbai", expected: "Nerul" },
  { query: "Sanpada mein road ka problem hai", expected: "Sanpada" },
  { query: "Pune", expected: "Pune" },
  { query: "मेरा गाँव सातारा में है", expected: "Satara" },
  { query: "400706", expected: "Nerul" },
];

async function main(): Promise<void> {
  for (const fixture of fixtures) {
    const result = await resolveIndianLocation(fixture.query, fixture.context);
    if (result.status !== "resolved" || result.resolved?.name !== fixture.expected) {
      throw new Error(`${fixture.query} resolved to ${result.resolved?.name ?? result.status}; expected ${fixture.expected}`);
    }
  }
  console.log(`Location resolver fixtures passed: ${fixtures.length}`);
}

void main();
