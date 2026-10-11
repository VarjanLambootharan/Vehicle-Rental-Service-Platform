package com.se1020.vehiclerental.support;

import static org.assertj.core.api.Assertions.assertThat;

import com.se1020.vehiclerental.common.text.TextCodec;
import java.util.Map;
import org.springframework.test.web.servlet.ResultMatcher;

/** Small test helper for assertions on decoded text responses. */
public record TextNode(Object value) {
  public static TextNode parse(String text) {
    return new TextNode(TextCodec.decode(text));
  }

  public TextNode get(String key) {
    return new TextNode(((Map<?, ?>) value).get(key));
  }

  public TextNode at(String path) {
    TextNode result = this;
    for (String key : path.substring(1).split("/")) result = result.get(key);
    return result;
  }

  public String asText() {
    return String.valueOf(value);
  }

  public static FieldAssertion textField(String path) {
    return new FieldAssertion(path.substring(2));
  }

  public record FieldAssertion(String key) {
    public ResultMatcher value(Object expected) {
      return result -> {
        Object actual = parse(result.getResponse().getContentAsString()).get(key).value;
        if (expected instanceof Number)
          assertThat(actual.toString()).isEqualTo(expected.toString());
        else assertThat(actual).isEqualTo(expected);
      };
    }

    public ResultMatcher doesNotExist() {
      return result ->
          assertThat(
                  ((Map<?, ?>) parse(result.getResponse().getContentAsString()).value)
                      .containsKey(key))
              .isFalse();
    }
  }
}
