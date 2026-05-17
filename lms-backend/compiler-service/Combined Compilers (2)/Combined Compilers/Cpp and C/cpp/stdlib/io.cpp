// std/io.cpp

// Basic IO helpers (wrappers around builtins).

string readLine() {
  return input();
}

string readLinePrompt(string prompt) {
  return input(prompt);
}
