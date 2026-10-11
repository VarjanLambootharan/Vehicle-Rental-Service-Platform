package com.se1020.vehiclerental.common.text;

import com.se1020.vehiclerental.customer.*;
import com.se1020.vehiclerental.vehicle.*;
import java.lang.reflect.*;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;

/** Maps explicit domain fields and record DTOs to text values; never loads a class from input. */
public final class TextMapper {
  private TextMapper() {}

  public static Object toValue(Object value) {
    if (value == null
        || value instanceof String
        || value instanceof Number
        || value instanceof Boolean) return value;
    if (value instanceof UUID
        || value instanceof Instant
        || value instanceof LocalDate
        || value instanceof Enum<?>) return value.toString();
    if (value instanceof Collection<?> items)
      return items.stream().map(TextMapper::toValue).toList();
    var result = new LinkedHashMap<String, Object>();
    if (value instanceof Map<?, ?> map) {
      map.forEach((key, item) -> result.put((String) key, toValue(item)));
      return result;
    }
    if (value instanceof User u) result.put("type", u.getRole().name());
    if (value instanceof Vehicle v) result.put("type", v.getType());
    try {
      for (Field field : fields(value.getClass())) {
        field.setAccessible(true);
        result.put(field.getName(), toValue(field.get(value)));
      }
      return result;
    } catch (ReflectiveOperationException e) {
      throw new IllegalArgumentException("Cannot encode text record", e);
    }
  }

  public static <T> T fromValue(Object value, Class<T> type, boolean storage) {
    return type.cast(convert(value, type, storage));
  }

  @SuppressWarnings({"unchecked", "rawtypes"})
  private static Object convert(Object value, Type target, boolean storage) {
    if (target instanceof ParameterizedType parameter && parameter.getRawType() == List.class) {
      if (!(value instanceof List<?> items)) throw new IllegalArgumentException("Expected list");
      var result = new ArrayList<>();
      for (Object item : items) {
        if (item == null) throw new IllegalArgumentException("Null list record");
        result.add(convert(item, parameter.getActualTypeArguments()[0], storage));
      }
      return result;
    }
    Class<?> type = (Class<?>) target;
    if (value == null) {
      if (type.isPrimitive()) throw new IllegalArgumentException("Null primitive");
      return null;
    }
    if (type == String.class) {
      if (!(value instanceof String)) throw new IllegalArgumentException("Expected string");
      return value;
    }
    if (type == boolean.class || type == Boolean.class) {
      if (!(value instanceof Boolean)) throw new IllegalArgumentException("Expected boolean");
      return value;
    }
    if (type == BigDecimal.class
        || type == Integer.class
        || type == int.class
        || type == Long.class
        || type == long.class) {
      if (!(value instanceof Number)) throw new IllegalArgumentException("Expected number");
      var number = new BigDecimal(value.toString());
      if (type == BigDecimal.class) return number;
      if (type == Integer.class || type == int.class) return number.intValueExact();
      return number.longValueExact();
    }
    if (type == UUID.class) return UUID.fromString((String) value);
    if (type == Instant.class) return Instant.parse((String) value);
    if (type == LocalDate.class) return LocalDate.parse((String) value);
    if (type.isEnum()) return Enum.valueOf((Class<Enum>) type, (String) value);
    if (!(value instanceof Map<?, ?> raw)) throw new IllegalArgumentException("Expected record");
    Map<String, Object> map = (Map<String, Object>) raw;
    boolean polymorphic = type == User.class || type == Vehicle.class;
    if (type == User.class)
      type =
          switch (String.valueOf(map.get("type"))) {
            case "ADMIN" -> Admin.class;
            case "CUSTOMER" -> Customer.class;
            default -> throw new IllegalArgumentException("Unknown user type");
          };
    if (type == Vehicle.class)
      type =
          switch (String.valueOf(map.get("type"))) {
            case "CAR" -> Car.class;
            case "MOTORCYCLE" -> Motorcycle.class;
            default -> throw new IllegalArgumentException("Unknown vehicle type");
          };
    var fields = fields(type);
    Set<String> allowed = new HashSet<>();
    if (polymorphic) allowed.add("type");
    for (Field field : fields) allowed.add(field.getName());
    if (!allowed.containsAll(map.keySet()))
      throw new IllegalArgumentException("Unknown record field");
    // Persisted records include every field, even explicit nulls. Never invent IDs/defaults.
    if (storage && !map.keySet().containsAll(allowed))
      throw new IllegalArgumentException("Incomplete stored record");
    try {
      if (type.isRecord()) {
        var components = type.getRecordComponents();
        Class<?>[] types =
            Arrays.stream(components).map(RecordComponent::getType).toArray(Class<?>[]::new);
        Object[] args = new Object[components.length];
        for (int i = 0; i < args.length; i++) {
          if (storage && map.get(components[i].getName()) == null)
            throw new IllegalArgumentException("Null stored record field");
          args[i] =
              convert(map.get(components[i].getName()), components[i].getGenericType(), storage);
        }
        return type.getDeclaredConstructor(types).newInstance(args);
      }
      if (!storage) throw new IllegalArgumentException("HTTP input must be a DTO record");
      var constructor = type.getDeclaredConstructor();
      constructor.setAccessible(true);
      Object result = constructor.newInstance();
      for (Field field : fields) {
        if (map.get(field.getName()) == null && !nullable(type, field.getName()))
          throw new IllegalArgumentException("Null required stored field: " + field.getName());
        field.setAccessible(true);
        field.set(result, convert(map.get(field.getName()), field.getGenericType(), true));
      }
      return result;
    } catch (ReflectiveOperationException | ArithmeticException e) {
      throw new IllegalArgumentException("Invalid typed text record", e);
    }
  }

  private static boolean nullable(Class<?> type, String field) {
    return switch (type.getSimpleName()) {
      case "Booking" -> Set.of("cancelledAt", "cancellationWorkflow").contains(field);
      case "Payment" ->
          Set.of("processedWorkflowId", "refundedAt", "simulatedRefundReference").contains(field);
      case "Review" -> field.equals("deletedAt");
      case "Notification" -> Set.of("readAt", "dismissedAt").contains(field);
      case "CancellationWorkflow" ->
          Set.of("originalPaymentId", "originalPaymentAmount").contains(field);
      default -> false;
    };
  }

  private static List<Field> fields(Class<?> type) {
    if (!type.getPackageName().startsWith("com.se1020.vehiclerental"))
      throw new IllegalArgumentException("Unsupported record type");
    var result = new ArrayList<Field>();
    for (Class<?> current = type;
        current != Object.class && current != Record.class;
        current = current.getSuperclass())
      for (Field field : current.getDeclaredFields())
        if (!Modifier.isStatic(field.getModifiers()) && !field.isSynthetic()) result.add(field);
    result.sort(Comparator.comparing(Field::getName));
    return result;
  }
}
