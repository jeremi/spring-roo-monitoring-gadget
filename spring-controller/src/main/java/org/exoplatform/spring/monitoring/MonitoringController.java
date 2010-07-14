package org.exoplatform.spring.monitoring;

import net.sf.json.JSONArray;
import net.sf.json.JSONObject;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;

import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Query;
import javax.persistence.metamodel.Attribute;
import javax.persistence.metamodel.EntityType;
import javax.persistence.metamodel.Metamodel;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;

import java.io.IOException;
import java.text.DateFormat;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.List;
import java.util.Set;

@RequestMapping("/monitoring/**")
@Controller
public class MonitoringController {
    @PersistenceContext
    private EntityManager entityManager;


    private JSONObject countObjectsByDate(String className, String fieldName, Date from, Date to) {
        //We can't use Group By date because in the petclinic sample the date also contains Time
        Query q = entityManager.createQuery("SELECT o." + fieldName + ", o.id FROM " + className + " AS o WHERE o." + fieldName + " BETWEEN :from AND :to");
        q.setParameter("from", from);
        q.setParameter("to", to);
        List<Object[]> rows = q.getResultList();

        JSONObject resp = new JSONObject();
        DateFormat df = new SimpleDateFormat("yyyy/MM/dd");

        for (Object[] row : rows) {
            Date date = (Date) row[0];
            String sDate = df.format(date);
            if (resp.containsKey(sDate)) {
                resp.put(sDate, ((Integer)resp.get(sDate)) + 1);
            } else {
                resp.put(sDate, 1);    
            }

        }
        
        return resp;
    }

    private JSONObject countObjectsByValue(String className, String fieldName) {
        Metamodel metamodel = entityManager.getMetamodel();

        //We can't use Group By date because in the petclinic sample the date also contains Time
        Query q = entityManager.createQuery("SELECT o." + fieldName + ", count(o.id) FROM " + className + " AS o GROUP BY " + fieldName);

        List<Object[]> rows = q.getResultList();

        JSONObject resp = new JSONObject();

        for (Object[] row : rows) {
            resp.put(row[0], row[1]);
        }

        return resp;
    }

    private JSONObject getObjectsInfo() {
        JSONObject data = new JSONObject();
        JSONArray objects = new JSONArray();
        JSONObject objectsProperties = new JSONObject();

        Metamodel metamodel = entityManager.getMetamodel();

        for (EntityType entityType : metamodel.getEntities()) {
            objects.add(entityType.getName());

            JSONArray properties = new JSONArray();
            Set<Attribute> attributes = entityType.getAttributes();
            for (Attribute attr : attributes)  {
                JSONObject property = new JSONObject();
                property.put("name", attr.getName());

                String type = attr.getJavaType().getName();

                if (type == "java.util.Date") {
                    property.put("isDate", true);
                } else {
                    property.put("isDate", false);
                }
                properties.add(property);
            }
            objectsProperties.put(entityType.getName(), properties);

        }


        data.put("properties", objectsProperties);
        data.put("objects", objects);
        return data;
    }


    private long countObjects(String className) {
        return ((Number) entityManager.createQuery("select count(o) from " + className + " o").getSingleResult()).longValue();   
    }

    private JSONObject countAllObjects() {
        JSONObject data = new JSONObject();
        Metamodel metamodel = entityManager.getMetamodel();

        for (EntityType entityType : metamodel.getEntities()) {
            data.put(entityType.getName(), countObjects(entityType.getName()));
        }
        return data;
    }

    private void sendResponse(JSONObject resp, HttpServletResponse response) {
        try {
            response.setStatus(200);
            response.getOutputStream().write(resp.toString().getBytes());
            response.getOutputStream().close();
        } catch (IOException e) {
            response.setStatus(500);
        }
    }

    @RequestMapping("/countObjectsByValue")
    public void countObjectsByValue(
                             @RequestParam String className,
                             @RequestParam String fieldName,
                             HttpServletRequest request,
                             HttpServletResponse response) {

        sendResponse(countObjectsByValue(className, fieldName), response);
    }

    @RequestMapping("/countObjectsByDate")
    public void countObjectsByDate(@RequestParam Date from,
                             @RequestParam Date to,
                             @RequestParam String className,
                             @RequestParam String fieldName,
                             HttpServletRequest request,
                             HttpServletResponse response) {

        sendResponse(countObjectsByDate(className, fieldName, from, to), response);
    }

    @RequestMapping("/countObjects")
    public void countObjects(HttpServletRequest request,
                             HttpServletResponse response) {

        sendResponse(countAllObjects(), response);
    }

    @RequestMapping("/objectInfos")
    public void getObjectsInfo(HttpServletRequest request,
                             HttpServletResponse response) {

        sendResponse(getObjectsInfo(), response);
    }
}
