import React, { useState } from "react";
import moment from "moment";
import {
  IconButton,
  Grid,
  makeStyles,
  Card,
  Button,
  CircularProgress,
  Popover,
} from "@material-ui/core";
import { createMuiTheme, ThemeProvider } from "@material-ui/core/styles";
import { ArrowLeft, ArrowRight } from "@material-ui/icons";

const CalendarTemplate = ({
  availability,
  setAvailability,
  primaryColor = "#DF1B1B",
  secondaryColor = "#47b2a2",
  fontFamily = "Roboto",
  fontSize = 12,
  primaryFontColor = "#222222",
  startTime = "8:00",
  endTime = "20:00",
  interval = 60, // in minutes, must be >= 1 and <= 60
}) => {
  const momentStarTime = strToMoment(startTime);
  const momentEndTime = strToMoment(endTime);

  const theme = createMuiTheme({
    typography: {
      fontFamily: `${fontFamily}`,
      fontSize: fontSize,
    },
    palette: {
      primary: {
        main: primaryColor,
      },
      secondary: {
        main: secondaryColor,
      },
      text: {
        primary: primaryFontColor,
      },
    },
  });

  const useStyles = makeStyles((theme) => ({
    calendar: {
      fontFamily: theme.typography.fontFamily,
    },
    calendarText: {
      margin: 0,
      width: 25,
      height: 25,
      textAlign: "center",
    },
    button: {
      minWidth: 200,
      margin: 10,
      fontFamily: theme.typography.fontFamily,
    },
    buttonNoMargin: {
      minWidth: 200,
      fontFamily: theme.typography.fontFamily,
    },
    popover: {
      pointerEvents: "none",
      fontFamily: theme.typography.fontFamily,
    },
    paper: {
      padding: theme.spacing(1),
    },
  }));

  const useMonths = (year) =>
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
      .map((month) => {
        // Left-pad to conform to ISO
        const paddedMonth = month < 10 ? `0${month}` : month;

        const mom = moment(`${year}-${paddedMonth}-01`);

        return {
          lastDay: mom.daysInMonth(),
          month: mom.format("MMMM"),
          firstDay: mom,
        };
      })
      .reduce((acc, curr, currIdx) => {
        acc[currIdx + 1] = curr;

        return acc;
      }, {});

  const getDefaultTimes = () => {
    const times = [];

    let currTime = momentStarTime;

    while (true) {
      const isBetween = currTime.isBetween(
        momentStarTime,
        momentEndTime,
        undefined,
        "[]"
      );

      if (isBetween) {
        const time = currTime.format("HH:mm");
        times.push({ time, available: false });

        currTime = currTime.clone().add(interval, "minutes");
      } else {
        break;
      }
    }

    return times;
  };

  function TimeButton({ className, start, end, available, handleClick }) {
    return (
      <Button
        onClick={handleClick}
        color={available ? "primary" : "default"}
        className={className}
        variant={available ? "contained" : "outlined"}
      >
        {start} - {end}
      </Button>
    );
  }

  function getDaysArray() {
    return [
      ["", "", "", "", "", "", ""],
      ["", "", "", "", "", "", ""],
      ["", "", "", "", "", "", ""],
      ["", "", "", "", "", "", ""],
      ["", "", "", "", "", "", ""],
      ["", "", "", "", "", "", ""],
    ];
  }

  const convertAvailabilityFromDatabase = (availability) => {
    const output = {};
    for (let range of availability) {
      let start = moment(range.start);
      let startStr = `${start.format("H")}:${start.format("mm")}`;
      let end = moment(range.end);
      let endStr = `${end.format("H")}:${end.format("mm")}`;
      let year = Number(start.format("YYYY"));
      let month = start.format("MMMM");
      let day = Number(start.format("D"));
      fillOutputWithDefaultTimes(output, year, month, day);
      let i = 0;
      while (
        i < output[year][month][day].length &&
        output[year][month][day][i].time !== startStr
      )
        i++;
      while (
        i < output[year][month][day].length &&
        output[year][month][day][i].time !== endStr
      ) {
        output[year][month][day][i].available = true;
        i++;
      }
    }
    return output;
  };

  const convertAvailabilityForDatabase = (availability) => {
    const output = [];
    for (let year in availability) {
      for (let month in availability[year]) {
        for (let day in availability[year][month]) {
          let activeDay = availability[year][month][day];
          addActiveDayToOutput(activeDay, output, month, day, year);
        }
      }
    }
    return output;
  };

  const combineTimeArrays = (a, b) => {
    for (let i = 0; i < a.length; i++) {
      a[i].available = a[i].available || b[i].available;
    }
    return a;
  };
  function addActiveDayToOutput(activeDay, output, month, day, year) {
    let activeRangeStart = null;
    for (let time of activeDay) {
      if (time.available && !activeRangeStart) activeRangeStart = time.time;
      else if (!time.available && activeRangeStart) {
        output.push({
          start: new Date(`${month} ${day} ${year} ${activeRangeStart}`),
          end: new Date(`${month} ${day} ${year} ${time.time}`),
        });
        activeRangeStart = null;
      }
    }
  }

  function fillOutputWithDefaultTimes(output, year, month, day) {
    if (output.hasOwnProperty(year)) {
      if (output[year].hasOwnProperty(month)) {
        if (!output[year][month].hasOwnProperty(day)) {
          output[year][month][day] = getDefaultTimes();
        }
      } else {
        output[year][month] = {
          [day]: getDefaultTimes(),
        };
      }
    } else {
      output[year] = {
        [month]: {
          [day]: getDefaultTimes(),
        },
      };
    }
  }

  function makeQuickAvailability(availability) {
    const output = {};
    for (let range of availability) {
      if (new Date(range.start) > new Date()) {
        let day = moment(range.start).format("MMMM D, YYYY");
        let time = `${moment(range.start).format("H:mm")} - ${moment(
          range.end
        ).format("H:mm")}`;
        if (output[day]) {
          output[day].push(time);
        } else {
          output[day] = [time];
        }
      }
    }
    return output;
  }
  return function Calendar() {
    const classes = useStyles();
    const today = moment();
    const [availabilityState, setAvailabilityState] = useState(
      convertAvailabilityFromDatabase(availability)
    );
    const [quickAvailability, setQuickAvailability] = useState(
      makeQuickAvailability(availability)
    );
    const [activeDay, setActiveDay] = useState(null);
    const [year, setYear] = useState(Number(today.format("YYYY")));
    const [monthNumber, setMonthNumber] = useState(Number(today.format("M")));
    const [settingMultiple, setSettingMultiple] = useState(false);
    const months = useMonths(year);
    const { firstDay, month, lastDay } = months[monthNumber];
    let dayOfWeek = Number(moment(firstDay).format("d"));
    const days = getDaysArray();
    const [times, setTimes] = useState(getDefaultTimes());
    const [saving, setSaving] = useState(false);
    let week = 0;
    let dayOfMonth = 1;
    while (week < 6 && dayOfMonth <= lastDay) {
      days[week][dayOfWeek] = dayOfMonth;
      dayOfMonth++;
      dayOfWeek++;
      if (dayOfWeek === 7) {
        week++;
        dayOfWeek = 0;
      }
    }
    const createArrowHandler = (delta) => () => {
      let newMonth = monthNumber + delta;
      if (newMonth > 12) {
        setYear(year + 1);
        newMonth = 1;
      } else if (newMonth < 1) {
        setYear(year - 1);
        newMonth = 12;
      }
      setActiveDay(null);
      setTimes(getDefaultTimes());
      setMonthNumber(newMonth);
    };
    const createTimeHandler = (i) => () => {
      const newTimes = [...times];
      newTimes[i].available = !newTimes[i].available;
      if (activeDay) {
        addTimeToDay(newTimes);
      }
      setTimes(newTimes);
    };
    const createDayHandler = (day) => () => {
      if (settingMultiple) {
        addTimesToDay(day);
      } else {
        examineAvailabilityForDay(day);
      }
    };
    const handleSetMultiple = () => {
      setActiveDay(null);
      setSettingMultiple(!settingMultiple);
    };
    const handleSaveAvailability = () => {
      const data = convertAvailabilityForDatabase(availabilityState);
      setSaving(true);
      setAvailability(data);
    };
    const handleJumpToCurrent = () => {
      setYear(Number(today.format("YYYY")));
      setMonthNumber(Number(today.format("M")));
      setActiveDay(null);
      setTimes(getDefaultTimes());
    };
    const [anchorEl, setAnchorEl] = useState(null);
    const [popoverContent, setPopoverContent] = useState(null);
    const handleOpenPopover = (date) => {
      return (e) => {
        if (quickAvailability[date]) {
          setPopoverContent(
            quickAvailability[date].map((time) => <p key={time}>{time}</p>)
          );
          setAnchorEl(e.target);
        }
      };
    };
    const handleClosePopover = () => {
      setAnchorEl(null);
      setPopoverContent(null);
    };

    const midPt = Math.floor(times.length / 2);
    const timesFirstHalf = times.slice(0, midPt);
    const timesSecondHalf = times.slice(midPt, times.length);

    return (
      <ThemeProvider theme={theme}>
        <Grid
          className={classes.calendar}
          container
          direction="column"
          alignItems="center"
        >
          <Grid item>
            <Grid
              container
              direction="row"
              alignItems="center"
              justifyContent="center"
            >
              <Grid item>
                <IconButton
                  disabled={
                    year === Number(today.format("YYYY")) &&
                    month === today.format("MMMM")
                  }
                  onClick={createArrowHandler(-1)}
                >
                  <ArrowLeft />
                </IconButton>
              </Grid>
              <Grid item>
                <Card style={{ padding: 10, margin: 10 }} variant="outlined">
                  <Grid container direction="column" alignItems="center">
                    <h3>
                      {month} {year}
                    </h3>
                    {days.map((week, i) => (
                      <Grid key={i} item>
                        <Grid container direction="row">
                          {week.map((day, i) => (
                            <Grid key={year + month + i} item>
                              <IconButton
                                onClick={createDayHandler(day)}
                                color={
                                  activeDay === day
                                    ? "primary"
                                    : availabilityState[year] &&
                                      availabilityState[year][month] &&
                                      availabilityState[year][month][day] &&
                                      availabilityState[year][month][
                                        day
                                      ].filter((x) => x.available).length > 0
                                    ? "secondary"
                                    : "default"
                                }
                                disabled={
                                  !day ||
                                  (year === Number(today.format("YYYY")) &&
                                    month === today.format("MMMM") &&
                                    day <= Number(today.format("D")))
                                }
                                size="medium"
                                onMouseEnter={handleOpenPopover(
                                  `${month} ${day}, ${year}`
                                )}
                                onMouseLeave={handleClosePopover}
                              >
                                <p className={classes.calendarText}>{day}</p>
                              </IconButton>
                            </Grid>
                          ))}
                        </Grid>
                      </Grid>
                    ))}
                    <Popover
                      anchorOrigin={{
                        vertical: "bottom",
                        horizontal: "center",
                      }}
                      className={classes.popover}
                      classes={{ paper: classes.paper }}
                      anchorEl={anchorEl}
                      open={!!anchorEl}
                    >
                      {popoverContent}
                    </Popover>
                    <Button
                      disabled={
                        year === Number(today.format("YYYY")) &&
                        month === today.format("MMMM")
                      }
                      onClick={handleJumpToCurrent}
                      className={classes.buttonNoMargin}
                    >
                      Jump to Current Month
                    </Button>
                  </Grid>
                </Card>
              </Grid>
              <Grid item>
                <IconButton onClick={createArrowHandler(1)}>
                  <ArrowRight />
                </IconButton>
              </Grid>
              <Grid item>
                <Grid
                  container
                  justifyContent="center"
                  alignItems="center"
                  wrap="wrap"
                >
                  <Grid item>
                    <Grid
                      container
                      direction="column"
                      alignItems="center"
                      wrap="wrap"
                    >
                      {timesFirstHalf.map(
                        (time, i) =>
                          i < times.length - 1 && (
                            <TimeButton
                              key={time.time}
                              className={classes.button}
                              start={formatTime(time.time, TIME_FORMAT)}
                              end={formatTime(times[i + 1].time, TIME_FORMAT)}
                              handleClick={createTimeHandler(i)}
                              available={time.available}
                            />
                          )
                      )}
                    </Grid>
                  </Grid>
                  <Grid item>
                    <Grid
                      container
                      direction="column"
                      alignItems="center"
                      wrap="wrap"
                    >
                      {timesSecondHalf.map((time, i) => {
                        // We are iterating over the second half of `times` so we need to offset the index by the length of the first half
                        const adjustedIdx = timesFirstHalf.length + i;

                        return (
                          adjustedIdx < times.length - 1 && (
                            <TimeButton
                              key={time.time}
                              className={classes.button}
                              start={formatTime(time.time, TIME_FORMAT)}
                              end={formatTime(
                                times[adjustedIdx + 1].time,
                                TIME_FORMAT
                              )}
                              handleClick={createTimeHandler(adjustedIdx)}
                              available={time.available}
                            />
                          )
                        );
                      })}
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
          <Grid item>
            <Grid
              container
              direction="row"
              alignItems="center"
              justifyContent="center"
            >
              <Grid item>
                <Button
                  color="primary"
                  variant="contained"
                  onClick={handleSetMultiple}
                  className={classes.button}
                >
                  {settingMultiple
                    ? "Done"
                    : "Add Selected Times to Multiple Days"}
                </Button>
              </Grid>
              <Grid item>
                {saving ? (
                  <CircularProgress />
                ) : (
                  <Button
                    color="primary"
                    variant="contained"
                    onClick={handleSaveAvailability}
                    className={classes.button}
                  >
                    Save Availability
                  </Button>
                )}
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </ThemeProvider>
    );

    function addTimeToDay(newTimes) {
      const newAvail = availabilityState;
      if (newAvail.hasOwnProperty(year)) {
        if (newAvail[year].hasOwnProperty(month)) {
          newAvail[year][month][activeDay] = newTimes;
        } else {
          newAvail[year][month] = {
            [activeDay]: newTimes,
          };
        }
      } else {
        newAvail[year] = {
          [month]: {
            [activeDay]: newTimes,
          },
        };
      }
      setAvailabilityState(newAvail);
      setQuickAvailability(
        makeQuickAvailability(convertAvailabilityForDatabase(newAvail))
      );
    }

    function examineAvailabilityForDay(day) {
      if (
        availabilityState[year] &&
        availabilityState[year][month] &&
        availabilityState[year][month][day]
      ) {
        setTimes(availabilityState[year][month][day]);
      } else {
        setTimes(getDefaultTimes());
      }
      setActiveDay(day);
    }

    function addTimesToDay(day) {
      const newAvail = { ...availabilityState };
      if (newAvail[year]) {
        if (newAvail[year][month]) {
          if (newAvail[year][month][day]) {
            newAvail[year][month][day] = combineTimeArrays(
              newAvail[year][month][day],
              times
            );
          } else {
            newAvail[year][month][day] = times;
          }
        } else {
          newAvail[year][month] = {
            [day]: times,
          };
        }
      } else {
        newAvail[year] = {
          [month]: {
            [day]: times,
          },
        };
      }
      setAvailabilityState(newAvail);
      setQuickAvailability(
        makeQuickAvailability(convertAvailabilityForDatabase(newAvail))
      );
    }
  };
};

const TIME_FORMAT = "h:mm A";

const strToMoment = (str) => {
  return moment(str, "HH:mm");
};

const formatTime = (timeStr, formatStr) =>
  moment(timeStr, "HH:mm").format(formatStr);

export default CalendarTemplate;
