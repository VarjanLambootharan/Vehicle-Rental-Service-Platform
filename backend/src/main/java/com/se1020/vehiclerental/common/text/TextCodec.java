package com.se1020.vehiclerental.common.text;

import java.io.*;
import java.math.BigDecimal;
import java.util.*;

/** Versioned UTF-8 line protocol. Each line is a tag, then a tab and escaped text. */
public final class TextCodec {
  public static final String HEADER = "TRAVELER-TEXT-1";
  private static final int MAX_DEPTH = 32;
  private static final int MAX_ITEMS = 1_000_000;

  private TextCodec() {}

  public static Object read(BufferedReader reader) throws IOException {
    if (!HEADER.equals(reader.readLine())) throw new IOException("Invalid text format header");
    Object value = readValue(reader, 0);
    if (reader.readLine() != null) throw new IOException("Unexpected trailing text");
    return value;
  }

  public static Object decode(String text) {
    try (var reader = new BufferedReader(new StringReader(text))) {
      return read(reader);
    } catch (IOException e) {
      throw new IllegalArgumentException("Invalid text document", e);
    }
  }

  public static void write(BufferedWriter writer, Object value) throws IOException {
    writer.write(HEADER + "\n");
    writeValue(writer, value, 0);
  }

  public static String encode(Object value) {
    var result = new StringWriter();
    try (var writer = new BufferedWriter(result)) {
      write(writer, value);
    } catch (IOException e) {
      throw new UncheckedIOException(e);
    }
    return result.toString();
  }

  private static Object readValue(BufferedReader reader, int depth) throws IOException {
    if (depth > MAX_DEPTH) throw new IOException("Text nesting limit exceeded");
    String line = reader.readLine();
    if (line == null) throw new EOFException("Truncated text document");
    if (line.equals("null")) return null;
    int tab = line.indexOf('\t');
    if (tab < 0) throw new IOException("Missing value separator");
    String tag = line.substring(0, tab), value = line.substring(tab + 1);
    try {
      return switch (tag) {
        case "string" -> unescape(value);
        case "number" -> {
          if (!value.matches("-?(0|[1-9][0-9]*)(\\.[0-9]+)?([eE][+-]?[0-9]+)?"))
            throw new IOException("Invalid decimal");
          yield new BigDecimal(value);
        }
        case "boolean" -> {
          if (!value.equals("true") && !value.equals("false"))
            throw new IOException("Invalid boolean");
          yield Boolean.valueOf(value);
        }
        case "list" -> {
          int size = count(value);
          var result = new ArrayList<Object>();
          for (int i = 0; i < size; i++) result.add(readValue(reader, depth + 1));
          yield result;
        }
        case "object" -> {
          int size = count(value);
          var result = new LinkedHashMap<String, Object>();
          for (int i = 0; i < size; i++) {
            String keyLine = reader.readLine();
            if (keyLine == null || !keyLine.startsWith("key\t"))
              throw new IOException("Missing field name");
            String key = unescape(keyLine.substring(4));
            if (result.containsKey(key)) throw new IOException("Duplicate field: " + key);
            result.put(key, readValue(reader, depth + 1));
          }
          yield result;
        }
        default -> throw new IOException("Unknown text tag: " + tag);
      };
    } catch (NumberFormatException e) {
      throw new IOException("Invalid number", e);
    }
  }

  private static int count(String text) throws IOException {
    if (!text.matches("0|[1-9][0-9]*")) throw new IOException("Invalid item count");
    int count = Integer.parseInt(text);
    if (count > MAX_ITEMS) throw new IOException("Too many items");
    return count;
  }

  private static void writeValue(BufferedWriter writer, Object value, int depth)
      throws IOException {
    if (depth > MAX_DEPTH) throw new IOException("Text nesting limit exceeded");
    if (value == null) writer.write("null\n");
    else if (value instanceof String s) writer.write("string\t" + escape(s) + "\n");
    else if (value instanceof Boolean b) writer.write("boolean\t" + b + "\n");
    else if (value instanceof Number n) writer.write("number\t" + n + "\n");
    else if (value instanceof List<?> list) {
      writer.write("list\t" + list.size() + "\n");
      for (Object item : list) writeValue(writer, item, depth + 1);
    } else if (value instanceof Map<?, ?> map) {
      writer.write("object\t" + map.size() + "\n");
      for (var entry : map.entrySet()) {
        if (!(entry.getKey() instanceof String key))
          throw new IOException("Field names must be strings");
        writer.write("key\t" + escape(key) + "\n");
        writeValue(writer, entry.getValue(), depth + 1);
      }
    } else throw new IOException("Unsupported text value");
  }

  private static String escape(String value) {
    return value
        .replace("\\", "\\\\")
        .replace("\t", "\\t")
        .replace("\r", "\\r")
        .replace("\n", "\\n");
  }

  private static String unescape(String value) throws IOException {
    var result = new StringBuilder();
    for (int i = 0; i < value.length(); i++) {
      char c = value.charAt(i);
      if (c == '\t' || c == '\r') throw new IOException("Unescaped separator");
      if (c == '\\') {
        if (++i == value.length()) throw new IOException("Truncated escape");
        c =
            switch (value.charAt(i)) {
              case '\\' -> '\\';
              case 't' -> '\t';
              case 'n' -> '\n';
              case 'r' -> '\r';
              default -> throw new IOException("Unknown escape");
            };
      }
      result.append(c);
    }
    return result.toString();
  }
}
