const t1 = `#include <stdio.h>\nint main() {\n  printf("hello");\n}`;
const t2 = `int main(int argc, char** argv) { return 0; }`;

const re = /int\s+main\s*\(([^)]*)\)\s*\{/;
console.log(t1.replace(re, "int main($1) {\n    setvbuf(stdout, NULL, _IONBF, 0);\n"));
console.log(t2.replace(re, "int main($1) {\n    setvbuf(stdout, NULL, _IONBF, 0);\n"));
