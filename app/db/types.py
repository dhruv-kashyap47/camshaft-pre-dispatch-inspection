from sqlalchemy.types import String, TypeDecorator


class CharBool(TypeDecorator):
    impl = String(1)
    cache_ok = True

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        return value == "Y"

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        return "Y" if value else "N"
