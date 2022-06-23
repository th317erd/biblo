# biblo

Biblo is a Javascript documentation generator

# Format

```
/// # You can write any caption you want here
/// because this is all just markdown
///
/// ::: (mark down stops)
/// Returns: { name: string; age: number }
/// Params:
///   arg1: string;
///   arg2: string;
/// Example:
/// ```javascript
/// import something from 'something';
/// assert_eq!(something(), true);
/// ```
```