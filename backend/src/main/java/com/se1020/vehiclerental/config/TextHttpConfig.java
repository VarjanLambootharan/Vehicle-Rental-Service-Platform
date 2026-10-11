package com.se1020.vehiclerental.config;

import com.se1020.vehiclerental.common.text.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.*;
import org.springframework.http.converter.*;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class TextHttpConfig implements WebMvcConfigurer {
  @Override
  public void configureMessageConverters(List<HttpMessageConverter<?>> converters) {
    converters.add(new TextConverter());
  }

  /** Only text/plain is accepted; Spring validation still runs on the original DTO records. */
  static final class TextConverter extends AbstractHttpMessageConverter<Object> {
    TextConverter() {
      super(new MediaType("text", "plain", StandardCharsets.UTF_8));
    }

    @Override
    protected boolean supports(Class<?> type) {
      return true;
    }

    @Override
    protected Object readInternal(Class<?> type, HttpInputMessage input) throws IOException {
      try {
        // Bounded network input; business files are streamed separately by TextFileStore.
        byte[] bytes = input.getBody().readNBytes(1_048_577);
        if (bytes.length > 1_048_576) throw new IllegalArgumentException("Request too large");
        return TextMapper.fromValue(
            TextCodec.decode(new String(bytes, StandardCharsets.UTF_8)), type, false);
      } catch (RuntimeException e) {
        throw new HttpMessageNotReadableException("Invalid text request", e, input);
      }
    }

    @Override
    protected void writeInternal(Object value, HttpOutputMessage output) throws IOException {
      var writer =
          new BufferedWriter(new OutputStreamWriter(output.getBody(), StandardCharsets.UTF_8));
      TextCodec.write(writer, TextMapper.toValue(value));
      writer.flush();
    }
  }
}
