from datetime import date, timedelta


def _calculate_easter_sunday(year):
    """Return Easter Sunday for the Gregorian calendar."""
    a = year % 19
    b = year // 100
    c = year % 100
    d = b // 4
    e = b % 4
    f = (b + 8) // 25
    g = (b - f + 1) // 3
    h = (19 * a + b - d - g + 15) % 30
    i = c // 4
    k = c % 4
    l = (32 + 2 * e + 2 * i - h - k) % 7
    m = (a + 11 * h + 22 * l) // 451
    month = (h + l - 7 * m + 114) // 31
    day = ((h + l - 7 * m + 114) % 31) + 1
    return date(year, month, day)


def _move_to_next_monday(holiday_date):
    days_until_monday = (7 - holiday_date.weekday()) % 7
    return holiday_date + timedelta(days=days_until_monday)


def get_colombian_holidays(year):
    """
    Return the national holidays observed in Colombia for a given year.

    Includes fixed-date holidays, Emiliani holidays moved to Monday, and
    Easter-related holidays.
    """
    easter_sunday = _calculate_easter_sunday(year)

    fixed_holidays = {
        date(year, 1, 1),
        date(year, 5, 1),
        date(year, 7, 20),
        date(year, 8, 7),
        date(year, 12, 8),
        date(year, 12, 25),
    }

    emiliani_holidays = {
        _move_to_next_monday(date(year, 1, 6)),
        _move_to_next_monday(date(year, 3, 19)),
        _move_to_next_monday(date(year, 6, 29)),
        _move_to_next_monday(date(year, 8, 15)),
        _move_to_next_monday(date(year, 10, 12)),
        _move_to_next_monday(date(year, 11, 1)),
        _move_to_next_monday(date(year, 11, 11)),
    }

    easter_related_holidays = {
        easter_sunday - timedelta(days=3),   # Jueves Santo
        easter_sunday - timedelta(days=2),   # Viernes Santo
        easter_sunday + timedelta(days=43),  # Ascensión trasladada
        easter_sunday + timedelta(days=64),  # Corpus Christi trasladado
        easter_sunday + timedelta(days=71),  # Sagrado Corazón trasladado
    }

    return fixed_holidays | emiliani_holidays | easter_related_holidays


def is_colombian_holiday(target_date):
    return target_date in get_colombian_holidays(target_date.year)
