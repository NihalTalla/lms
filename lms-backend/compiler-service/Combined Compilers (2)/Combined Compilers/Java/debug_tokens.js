const { tokenize } = require('./java/lexer/lexer');

const code = `
class Test {
    public static void main() {
        StringBuilder sb = new StringBuilder();
        sb.append("Hello");
        sb.append(" ");
        sb.append("World");
        
        String result = sb.toString();
        System.out.println(result);
        System.out.println(sb.length());
    }
}
`;

const tokens = tokenize(code);
console.log("=== TOKENS ===");
tokens.forEach((t, i) => {
  console.log(`${i}: ${t.type}${t.value ? ' (' + t.value + ')' : ''}`);
});
